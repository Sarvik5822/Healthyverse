/**
 * useStepSync.js
 *
 * Handles step data synchronization with the backend:
 * - Fetching backend steps (for reinstall/merge scenarios)
 * - Syncing local steps to backend
 * - Managing backend offset
 * - Granular entry sync
 * - Yesterday data sync
 * - Periodic sync service lifecycle
 *
 * Extracted from StepContext for modularity.
 *
 * UPDATED: Imports from trackerFactory (individual API files deleted)
 * FIXED: Added missing methods that StepContext.js expects:
 *   - setBackendSteps, initializeSyncService, cleanupSyncService,
 *   - finalSync, syncYesterdayData, recordEntry
 */

import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StepSyncService from '../services/StepSyncService';
import StepEntryService from '../services/StepEntryService';
import { getStepsProgress, addSteps } from '../api/trackerFactory';
import { calculateStepMetrics, getTodayDateString } from '../utils/stepCalculator';

// AsyncStorage keys
const BACKEND_OFFSET_KEY = '@steps_backend_offset';
const BACKEND_OFFSET_DATE_KEY = '@steps_backend_offset_date';
const YESTERDAY_STEPS_KEY = '@steps_yesterday';

const useStepSync = (getUserMetrics, backendOffsetRef, updateStepsLocallyRef) => {
  const [backendSteps, setBackendSteps] = useState(0);
  const [goal, setGoal] = useState(10000);

  // Ref for the getStepData callback used by sync service
  const getStepDataCallbackRef = useRef(null);

  /**
   * Fetch today's steps from backend to use as offset/floor.
   * Handles reinstall scenario where previously synced steps should still be visible.
   */
  const fetchBackendSteps = useCallback(async () => {
    try {
      const today = getTodayDateString();

      // Check cached offset first
      const savedOffset = await AsyncStorage.getItem(BACKEND_OFFSET_KEY);
      const savedOffsetDate = await AsyncStorage.getItem(BACKEND_OFFSET_DATE_KEY);

      // If cached offset is from a different day, reset
      if (savedOffsetDate && savedOffsetDate !== today) {
        // Save yesterday's steps before resetting
        if (savedOffset) {
          await AsyncStorage.setItem(YESTERDAY_STEPS_KEY, JSON.stringify({
            date: savedOffsetDate,
            steps: parseInt(savedOffset, 10),
          }));
        }
        backendOffsetRef.current = 0;
        setBackendSteps(0);
        await AsyncStorage.removeItem(BACKEND_OFFSET_KEY);
        await AsyncStorage.removeItem(BACKEND_OFFSET_DATE_KEY);
      } else if (savedOffsetDate === today && savedOffset) {
        const offset = parseInt(savedOffset, 10);
        backendOffsetRef.current = offset;
        setBackendSteps(offset);
        return offset;
      }

      // Fetch from backend API
      const response = await getStepsProgress();
      const apiSteps = response.data?.steps || response.data?.currentSteps || 0;
      const apiGoal = response.data?.goal || response.data?.dailyGoal || 10000;

      backendOffsetRef.current = apiSteps;
      setBackendSteps(apiSteps);
      setGoal(apiGoal);

      // Save backend offset for today
      await AsyncStorage.setItem(BACKEND_OFFSET_KEY, String(apiSteps));
      await AsyncStorage.setItem(BACKEND_OFFSET_DATE_KEY, today);

      // Share with Zustand store via ref callback
      if (updateStepsLocallyRef.current) {
        updateStepsLocallyRef.current(apiSteps, apiGoal);
      }

      return apiSteps;
    } catch (error) {
      console.error('[useStepSync] fetchBackendSteps error:', error);
      return 0;
    }
  }, [backendOffsetRef, updateStepsLocallyRef]);

  /**
   * Initialize the periodic sync service.
   * Called when step tracking starts.
   * @param {function} getStepData - Function that returns current step data object
   */
  const initializeSyncService = useCallback((getStepData) => {
    getStepDataCallbackRef.current = getStepData;
    StepSyncService.initialize(getStepData);
  }, []);

  /**
   * Clean up the sync service (stop periodic sync, remove listeners).
   * Called on logout or when tracking stops.
   */
  const cleanupSyncService = useCallback(() => {
    StepSyncService.cleanup();
    getStepDataCallbackRef.current = null;
  }, []);

  /**
   * Perform a final sync before stopping tracking (e.g., logout).
   * @param {number} totalSteps - Current total steps to sync
   */
  const finalSync = useCallback(async (totalSteps) => {
    try {
      if (totalSteps <= 0) return;

      const metrics = getUserMetrics ? getUserMetrics() : {};
      const calculated = calculateStepMetrics(totalSteps, metrics);
      const stepData = {
        date: getTodayDateString(),
        totalSteps,
        distance: calculated.distance,
        calories: calculated.calories,
      };

      await StepSyncService.syncStepsToBackend(stepData);

      // Also sync entries
      await StepEntryService.syncEntriesToBackend(getTodayDateString());
    } catch (error) {
      console.error('[useStepSync] finalSync error:', error);
    }
  }, [getUserMetrics]);

  /**
   * Sync yesterday's step data to backend (called on midnight crossing / new day).
   * @param {string} yesterdayDate - 'YYYY-MM-DD' of yesterday
   * @param {number} yesterdaySteps - Total steps from yesterday
   */
  const syncYesterdayData = useCallback(async (yesterdayDate, yesterdaySteps) => {
    try {
      if (yesterdaySteps <= 0 || !yesterdayDate) return;

      const metrics = getUserMetrics ? getUserMetrics() : {};
      const calculated = calculateStepMetrics(yesterdaySteps, metrics);

      const payload = {
        date: yesterdayDate,
        steps: yesterdaySteps,
        distance: calculated.distance,
        calories: calculated.calories,
      };

      await addSteps(payload);

      // Also sync yesterday's entries
      await StepEntryService.syncEntriesToBackend(yesterdayDate);

      console.log('[useStepSync] Yesterday sync complete:', payload);
    } catch (error) {
      console.error('[useStepSync] syncYesterdayData error:', error);
    }
  }, [getUserMetrics]);

  /**
   * Record a granular step entry (Google Fit-style time window).
   * Delegates to StepEntryService.
   * @param {string} date - 'YYYY-MM-DD'
   * @param {number} deltaSteps - Steps in this interval
   * @param {number} startTimestamp - Unix ms when window started
   * @param {number} endTimestamp - Unix ms when window ended
   */
  const recordEntry = useCallback(async (date, deltaSteps, startTimestamp, endTimestamp) => {
    await StepEntryService.recordEntry(date, deltaSteps, startTimestamp, endTimestamp);
  }, []);

  /**
   * Sync steps data to backend directly.
   * Called by periodic sync, app foreground, and manual sync.
   */
  const syncToBackend = useCallback(async (stepData) => {
    if (!stepData || stepData.totalSteps === 0) return false;
    return await StepSyncService.syncStepsToBackend(stepData);
  }, []);

  /**
   * Sync granular step entries to backend.
   * Called periodically alongside main step sync.
   */
  const syncEntries = useCallback(async () => {
    const today = getTodayDateString();
    return await StepEntryService.syncEntriesToBackend(today);
  }, []);

  /**
   * Get current step data formatted for backend sync.
   */
  const getStepDataForSync = useCallback((totalSteps) => {
    const today = getTodayDateString();
    const metrics = getUserMetrics ? getUserMetrics() : {};
    const calculated = calculateStepMetrics(totalSteps, metrics);

    return {
      date: today,
      totalSteps,
      distance: calculated.distance,
      calories: calculated.calories,
    };
  }, [getUserMetrics]);

  return {
    // State
    backendSteps,
    setBackendSteps,
    goal,
    setGoal,

    // Core sync methods (used by StepContext)
    fetchBackendSteps,
    initializeSyncService,
    cleanupSyncService,
    finalSync,
    syncYesterdayData,
    recordEntry,

    // Additional sync utilities
    syncToBackend,
    syncEntries,
    getStepDataForSync,
  };
};

export default useStepSync;