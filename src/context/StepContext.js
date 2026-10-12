/**
 * StepContext.js (Refactored - HealthDataContext REMOVED)
 *
 * CHANGES:
 * - Removed dependency on HealthDataContext entirely
 * - Now uses Zustand healthStore.setStepsData() to share live step count globally
 * - No more HealthDataContext import or useContext call
 * - updateStepsLocally replaced with direct Zustand store update
 *
 * This file ONLY orchestrates the specialized hooks:
 * - useStepSensor: sensor subscription & permission management
 * - useStepBaseline: baseline logic, reboot detection, daily reset
 * - useStepSync: backend sync, entry recording
 */

import React, { createContext, useState, useCallback, useEffect, useRef, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from './UserContext';
import useHealthStore from '../store/healthStore';
import { calculateStepMetrics, getTodayDateString } from '../utils/stepCalculator';
import StepEntryService from '../services/StepEntryService';
import StepService from '../services/StepService';
import useStepSensor from '../hooks/useStepSensor';
import useStepBaseline from '../hooks/useStepBaseline';
import useStepSync from '../hooks/useStepSync';

// FIX: AsyncStorage keys for persisting last known todaySteps (survives reload)
const LAST_TODAY_STEPS_KEY = '@steps_last_today_steps';
const LAST_TODAY_STEPS_DATE_KEY = '@steps_last_today_steps_date';

export const StepContext = createContext({});

export const StepProvider = ({ children }) => {
  // ─── External Context Dependencies ──────────────────────────────────────────
  const userContext = useContext(UserContext);
  const userProfile = userContext?.userProfile || null;
  const isAuthenticated = userContext?.isAuthenticated || false;

  // ─── Zustand Store (replaces HealthDataContext.updateStepsLocally) ───────────
  const setStepsData = useHealthStore((s) => s.setStepsData);
  const setStepsDataRef = useRef(setStepsData);
  setStepsDataRef.current = setStepsData;

  // Backward-compatible wrapper: same signature as old updateStepsLocally
  const updateStepsLocallyRef = useRef((steps, goal) => {
    setStepsDataRef.current({ steps, goal });
  });

  // ─── Local UI State ─────────────────────────────────────────────────────────
  const [currentSteps, setCurrentSteps] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref for latest todaySteps (avoids stale closure in startTracking's sync init)
  const todayStepsRef = useRef(0);
  const distanceRef = useRef(0);
  const caloriesRef = useRef(0);
  const startTrackingRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { todayStepsRef.current = todaySteps; }, [todaySteps]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { caloriesRef.current = calories; }, [calories]);

  // ─── FIX: Persist todaySteps to AsyncStorage on every update ────────────────
  useEffect(() => {
    if (todaySteps > 0) {
      const today = getTodayDateString();
      AsyncStorage.setItem(LAST_TODAY_STEPS_KEY, String(todaySteps));
      AsyncStorage.setItem(LAST_TODAY_STEPS_DATE_KEY, today);
    }
  }, [todaySteps]);

  // ─── User Metrics Helper ────────────────────────────────────────────────────
  const getUserMetrics = useCallback(() => {
    if (!userProfile) return {};
    return {
      heightCm: userProfile.height || userProfile.heightCm || null,
      weightKg: userProfile.weight || userProfile.weightKg || null,
    };
  }, [userProfile]);

  // ─── Initialize Specialized Hooks ───────────────────────────────────────────
  const sensor = useStepSensor();
  const baseline = useStepBaseline();
  const sync = useStepSync(getUserMetrics, baseline.backendOffsetRef, updateStepsLocallyRef);

  // ─── Stable refs for hooks (prevents useEffect re-triggers) ─────────────────
  const sensorRef = useRef(sensor);
  const baselineRef = useRef(baseline);
  const syncRef = useRef(sync);
  const getUserMetricsRef = useRef(getUserMetrics);

  // Keep refs updated
  useEffect(() => { sensorRef.current = sensor; }, [sensor]);
  useEffect(() => { baselineRef.current = baseline; }, [baseline]);
  useEffect(() => { syncRef.current = sync; }, [sync]);
  useEffect(() => { getUserMetricsRef.current = getUserMetrics; }, [getUserMetrics]);

  // ─── Core Orchestration: Handle Sensor Events ───────────────────────────────
  const handleStepUpdate = useCallback(async (event) => {
    const sensorValue = event.steps;
    setCurrentSteps(sensorValue);

    const currentBaseline = baselineRef.current;
    const currentSync = syncRef.current;

    // Step 1: Process sensor event through baseline logic
    const { sensorStepsToday, isNewDay, previousDate } = currentBaseline.processSensorEvent(sensorValue);

    // Step 2: Handle midnight crossing (new day)
    if (isNewDay) {
      const yesterdaySteps = currentBaseline.baselineRef.current > 0
        ? Math.max(0, sensorValue - currentBaseline.baselineRef.current)
        : 0;

      await currentSync.syncYesterdayData(previousDate, yesterdaySteps);
      await currentBaseline.handleNewDay(sensorValue);

      setTodaySteps(0);
      setDistance(0);
      setCalories(0);
      currentSync.setBackendSteps(0);

      StepEntryService.cleanupOldEntries();
      return;
    }

    // Step 3: Save baseline
    await currentBaseline.saveBaseline(currentBaseline.baselineRef.current);

    // Step 4: Record time window entry (Google Fit-style)
    const entryDelta = currentBaseline.getEntryDelta(sensorStepsToday);
    if (entryDelta) {
      currentSync.recordEntry(
        getTodayDateString(),
        entryDelta.deltaSteps,
        entryDelta.startTimestamp,
        entryDelta.endTimestamp
      );
    }

    // Step 5: Merge with backend offset
    const mergedSteps = Math.max(sensorStepsToday, currentBaseline.backendOffsetRef.current);
    setTodaySteps(mergedSteps);

    // Step 6: Share live steps with Zustand store (replaces HealthDataContext)
    if (updateStepsLocallyRef.current) {
      updateStepsLocallyRef.current(mergedSteps, null);
    }

    // Step 7: Calculate and update metrics
    const metrics = calculateStepMetrics(mergedSteps, getUserMetricsRef.current());
    setDistance(metrics.distance);
    setCalories(metrics.calories);
  }, []); // Empty deps — uses refs internally

  // ─── Start Tracking ─────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    try {
      const currentSensor = sensorRef.current;
      const currentSync = syncRef.current;

      const hasPermission = await currentSensor.requestPermission();
      if (!hasPermission) return false;

      const started = await currentSensor.startSensor(handleStepUpdate);
      if (!started) return false;

      currentSync.initializeSyncService(() => ({
        date: getTodayDateString(),
        totalSteps: todayStepsRef.current,
        distance: distanceRef.current,
        calories: caloriesRef.current,
      }));

      return true;
    } catch (error) {
      console.error('[StepContext] startTracking error:', error);
      return false;
    }
  }, [handleStepUpdate]);

  startTrackingRef.current = startTracking;

  // ─── Stop Tracking ──────────────────────────────────────────────────────────
  const stopTracking = useCallback(async () => {
    try {
      const currentSensor = sensorRef.current;
      const currentSync = syncRef.current;

      await currentSensor.stopSensor();
      currentSync.cleanupSyncService();
      await currentSync.finalSync(todayStepsRef.current);
      return true;
    } catch (error) {
      console.error('[StepContext] stopTracking error:', error);
      return false;
    }
  }, []);

  // ─── FIX: Restore steps immediately from AsyncStorage (before sensor event) ─
  const restoreStepsFromCache = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const [savedSteps, savedDate] = await Promise.all([
        AsyncStorage.getItem(LAST_TODAY_STEPS_KEY),
        AsyncStorage.getItem(LAST_TODAY_STEPS_DATE_KEY),
      ]);

      if (savedDate === today && savedSteps) {
        const cachedSteps = parseInt(savedSteps, 10);
        if (cachedSteps > 0) {
          setTodaySteps(prev => Math.max(prev, cachedSteps));
          const metrics = calculateStepMetrics(cachedSteps, getUserMetricsRef.current());
          setDistance(prev => Math.max(prev, metrics.distance));
          setCalories(prev => Math.max(prev, metrics.calories));

          // Also update Zustand store immediately
          if (updateStepsLocallyRef.current) {
            updateStepsLocallyRef.current(cachedSteps, null);
          }

          console.log('[StepContext] Restored cached steps:', cachedSteps);
          return cachedSteps;
        }
      } else if (savedDate && savedDate !== today) {
        // New day - clear cached steps
        await AsyncStorage.removeItem(LAST_TODAY_STEPS_KEY);
        await AsyncStorage.removeItem(LAST_TODAY_STEPS_DATE_KEY);
      }
      return 0;
    } catch (error) {
      console.error('[StepContext] restoreStepsFromCache error:', error);
      return 0;
    }
  }, []);

  // ─── Initialize ─────────────────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (Platform.OS !== 'android' || !isAuthenticated) {
      setIsInitialized(true);
      return;
    }

    try {
      const currentSensor = sensorRef.current;
      const currentBaseline = baselineRef.current;
      const currentSync = syncRef.current;

      // FIX: IMMEDIATELY restore cached steps so UI shows steps right away
      await restoreStepsFromCache();

      const sensorAvailable = await currentSensor.checkSensorAvailability();

      if (!sensorAvailable) {
        await currentSync.fetchBackendSteps();
        setIsInitialized(true);
        return;
      }

      await currentSensor.requestPermission();
      await currentBaseline.loadBaseline();

      // FIX: Try to get last known steps from native module (survives JS reload)
      const nativeLastSteps = await StepService.getLastKnownSteps();
      if (nativeLastSteps > 0 && currentBaseline.baselineRef.current > 0) {
        const nativeTodaySteps = Math.max(0, nativeLastSteps - currentBaseline.baselineRef.current);
        if (nativeTodaySteps > 0) {
          setTodaySteps(prev => Math.max(prev, nativeTodaySteps));
          const metrics = calculateStepMetrics(nativeTodaySteps, getUserMetricsRef.current());
          setDistance(prev => Math.max(prev, metrics.distance));
          setCalories(prev => Math.max(prev, metrics.calories));

          if (updateStepsLocallyRef.current) {
            updateStepsLocallyRef.current(nativeTodaySteps, null);
          }
          console.log('[StepContext] Restored from native module:', nativeTodaySteps);
        }
      }

      const apiSteps = await currentSync.fetchBackendSteps();
      if (apiSteps > 0) {
        setTodaySteps(prev => Math.max(prev, apiSteps));
        const metrics = calculateStepMetrics(apiSteps, getUserMetricsRef.current());
        setDistance(prev => Math.max(prev, metrics.distance));
        setCalories(prev => Math.max(prev, metrics.calories));
      }

      setIsInitialized(true);

      if (currentSensor.permissionGranted && startTrackingRef.current) {
        await startTrackingRef.current();
      }
    } catch (error) {
      console.error('[StepContext] initialize error:', error);
      setIsInitialized(true);
    }
  }, [isAuthenticated, restoreStepsFromCache]); // Only depends on isAuthenticated

  // ─── Lifecycle: Auth-based init/cleanup ─────────────────────────────────────
  // FIX: Only depend on isAuthenticated — not on hook objects that change every render
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    } else {
      // User logged out - cleanup everything
      const currentSensor = sensorRef.current;
      const currentSync = syncRef.current;
      const currentBaseline = baselineRef.current;

      currentSensor.cleanup();
      currentSync.cleanupSyncService();
      setCurrentSteps(0);
      setTodaySteps(0);
      setDistance(0);
      setCalories(0);
      currentSync.setBackendSteps(0);
      currentSensor.setPermissionGranted(false);
      setIsInitialized(false);
      currentBaseline.resetAll();
    }

    return () => {
      sensorRef.current.cleanup();
      syncRef.current.cleanupSyncService();
    };
  }, [isAuthenticated, initialize]);

  // ─── Re-calculate metrics when user profile changes ─────────────────────────
  useEffect(() => {
    if (todaySteps > 0) {
      const metrics = calculateStepMetrics(todaySteps, getUserMetricsRef.current());
      setDistance(metrics.distance);
      setCalories(metrics.calories);
    }
  }, [userProfile, todaySteps]);

  // ─── Public API ─────────────────────────────────────────────────────────────
  const getCurrentStepData = useCallback(() => ({
    date: getTodayDateString(),
    totalSteps: todaySteps,
    distance,
    calories,
  }), [todaySteps, distance, calories]);

  const value = {
    // State
    currentSteps,
    todaySteps,
    goal: sync.goal,
    distance,
    calories,
    backendSteps: sync.backendSteps,
    permissionGranted: sensor.permissionGranted,
    isSensorAvailable: sensor.isSensorAvailable,
    isTracking: sensor.isTracking,
    isInitialized,

    // Methods
    startTracking,
    stopTracking,
    getCurrentStepData,
    fetchBackendSteps: sync.fetchBackendSteps,
    setGoal: sync.setGoal,
  };

  return (
    <StepContext.Provider value={value}>
      {children}
    </StepContext.Provider>
  );
};

export const useStepContext = () => {
  const context = useContext(StepContext);
  if (!context) {
    throw new Error('useStepContext must be used within a StepProvider');
  }
  return context;
};