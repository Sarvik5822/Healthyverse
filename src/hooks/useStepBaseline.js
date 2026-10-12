/**
 * useStepBaseline.js
 * 
 * Manages step baseline logic including:
 * - AsyncStorage persistence
 * - Daily reset at midnight
 * - Device reboot detection
 * - Last recorded steps for delta calculation
 * - Time window tracking for Google Fit-style entries
 * 
 * Extracted from StepContext for modularity.
 */

import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '../utils/stepCalculator';

// AsyncStorage keys
const BASELINE_KEY = '@steps_baseline';
const BASELINE_DATE_KEY = '@steps_baseline_date';
const BACKEND_OFFSET_KEY = '@steps_backend_offset';
const BACKEND_OFFSET_DATE_KEY = '@steps_backend_offset_date';
const LAST_RECORDED_STEPS_KEY = '@steps_last_recorded';
const LAST_RECORDED_STEPS_DATE_KEY = '@steps_last_recorded_date';
const LAST_SENSOR_EVENT_TS_KEY = '@steps_last_sensor_event_ts';

const useStepBaseline = () => {
  // Refs for baseline management
  const baselineRef = useRef(0);
  const baselineDateRef = useRef(getTodayDateString());
  const backendOffsetRef = useRef(0);
  const lastRecordedStepsRef = useRef(0);
  const lastRecordedInitializedRef = useRef(false);
  const lastSensorEventTimestampRef = useRef(null);

  /**
   * Load saved baseline and related state from AsyncStorage.
   * Handles new day detection and state reset.
   */
  const loadBaseline = useCallback(async () => {
    try {
      const [savedBaseline, savedDate, savedLastRecorded, savedLastRecordedDate, savedLastEventTs] = await Promise.all([
        AsyncStorage.getItem(BASELINE_KEY),
        AsyncStorage.getItem(BASELINE_DATE_KEY),
        AsyncStorage.getItem(LAST_RECORDED_STEPS_KEY),
        AsyncStorage.getItem(LAST_RECORDED_STEPS_DATE_KEY),
        AsyncStorage.getItem(LAST_SENSOR_EVENT_TS_KEY),
      ]);

      const today = getTodayDateString();
      let isNewDay = false;

      if (savedDate && savedDate === today && savedBaseline) {
        // Same day - restore baseline
        baselineRef.current = parseFloat(savedBaseline);
        baselineDateRef.current = savedDate;

        // Restore lastRecordedStepsRef for today
        if (savedLastRecordedDate === today && savedLastRecorded) {
          lastRecordedStepsRef.current = parseInt(savedLastRecorded, 10);
          lastRecordedInitializedRef.current = true;
        } else {
          lastRecordedStepsRef.current = 0;
          lastRecordedInitializedRef.current = false;
        }

        // Restore last sensor event timestamp
        if (savedLastEventTs) {
          lastSensorEventTimestampRef.current = parseInt(savedLastEventTs, 10);
        }
      } else if (savedDate && savedDate !== today) {
        // New day detected - reset everything
        isNewDay = true;
        baselineRef.current = 0;
        baselineDateRef.current = today;
        backendOffsetRef.current = 0;
        lastRecordedStepsRef.current = 0;
        lastRecordedInitializedRef.current = false;
        lastSensorEventTimestampRef.current = null;

        await Promise.all([
          AsyncStorage.setItem(BASELINE_DATE_KEY, today),
          AsyncStorage.removeItem(BASELINE_KEY),
          AsyncStorage.removeItem(BACKEND_OFFSET_KEY),
          AsyncStorage.removeItem(BACKEND_OFFSET_DATE_KEY),
          AsyncStorage.removeItem(LAST_RECORDED_STEPS_KEY),
          AsyncStorage.removeItem(LAST_RECORDED_STEPS_DATE_KEY),
          AsyncStorage.removeItem(LAST_SENSOR_EVENT_TS_KEY),
        ]);
      } else {
        // No saved date (first time)
        if (savedLastRecordedDate === today && savedLastRecorded) {
          lastRecordedStepsRef.current = parseInt(savedLastRecorded, 10);
          lastRecordedInitializedRef.current = true;
        } else {
          lastRecordedInitializedRef.current = false;
        }
        if (savedLastEventTs) {
          lastSensorEventTimestampRef.current = parseInt(savedLastEventTs, 10);
        }
      }

      return { isNewDay };
    } catch (error) {
      console.error('[useStepBaseline] loadBaseline error:', error);
      return { isNewDay: false };
    }
  }, []);

  /**
   * Save current baseline to AsyncStorage.
   */
  const saveBaseline = useCallback(async (baseline) => {
    try {
      await AsyncStorage.setItem(BASELINE_KEY, String(baseline));
      await AsyncStorage.setItem(BASELINE_DATE_KEY, getTodayDateString());
    } catch (error) {
      console.error('[useStepBaseline] saveBaseline error:', error);
    }
  }, []);

  /**
   * Process a sensor event and determine today's steps.
   * Handles reboot detection, midnight crossing, and first reading.
   * 
   * @param {number} sensorValue - Raw sensor step count
   * @returns {{ sensorStepsToday: number, isNewDay: boolean, previousDate: string|null }}
   */
  const processSensorEvent = useCallback((sensorValue) => {
    const today = getTodayDateString();
    const now = Date.now();
    let isNewDay = false;
    let previousDate = null;

    // Check for midnight crossing
    if (baselineDateRef.current !== today) {
      isNewDay = true;
      previousDate = baselineDateRef.current;
      // Will be handled by the caller (StepContext)
      return { sensorStepsToday: 0, isNewDay, previousDate, now };
    }

    // Reboot detection: sensor value < baseline
    if (sensorValue < baselineRef.current) {
      baselineRef.current = sensorValue;
      lastRecordedStepsRef.current = 0;
      lastRecordedInitializedRef.current = true;
      lastSensorEventTimestampRef.current = now;
    }

    // First reading of the day
    if (baselineRef.current === 0) {
      baselineRef.current = sensorValue;
      lastRecordedStepsRef.current = 0;
      lastRecordedInitializedRef.current = true;
      lastSensorEventTimestampRef.current = now;
    }

    const sensorStepsToday = Math.max(0, sensorValue - baselineRef.current);
    return { sensorStepsToday, isNewDay, previousDate, now };
  }, []);

  /**
   * Record a time window entry delta.
   * Returns the delta and time window if there are new steps to record.
   * 
   * @param {number} sensorStepsToday - Current calculated steps for today
   * @returns {{ deltaSteps: number, startTimestamp: number, endTimestamp: number } | null}
   */
  const getEntryDelta = useCallback((sensorStepsToday) => {
    const now = Date.now();
    const today = getTodayDateString();

    if (!lastRecordedInitializedRef.current) {
      // First sensor event after restart - initialize without recording
      lastRecordedStepsRef.current = sensorStepsToday;
      lastRecordedInitializedRef.current = true;
      lastSensorEventTimestampRef.current = now;
      AsyncStorage.setItem(LAST_RECORDED_STEPS_KEY, String(sensorStepsToday));
      AsyncStorage.setItem(LAST_RECORDED_STEPS_DATE_KEY, today);
      AsyncStorage.setItem(LAST_SENSOR_EVENT_TS_KEY, String(now));
      return null;
    }

    const deltaSteps = sensorStepsToday - lastRecordedStepsRef.current;
    if (deltaSteps > 0) {
      const startTimestamp = lastSensorEventTimestampRef.current || now;
      const endTimestamp = now;

      lastRecordedStepsRef.current = sensorStepsToday;
      lastSensorEventTimestampRef.current = now;

      // Persist
      AsyncStorage.setItem(LAST_RECORDED_STEPS_KEY, String(sensorStepsToday));
      AsyncStorage.setItem(LAST_RECORDED_STEPS_DATE_KEY, today);
      AsyncStorage.setItem(LAST_SENSOR_EVENT_TS_KEY, String(now));

      return { deltaSteps, startTimestamp, endTimestamp };
    }

    return null;
  }, []);

  /**
   * Handle new day transition - reset baseline and persist.
   */
  const handleNewDay = useCallback(async (sensorValue) => {
    const today = getTodayDateString();
    const now = Date.now();

    baselineRef.current = sensorValue;
    baselineDateRef.current = today;
    backendOffsetRef.current = 0;
    lastRecordedStepsRef.current = 0;
    lastRecordedInitializedRef.current = true;
    lastSensorEventTimestampRef.current = now;

    await Promise.all([
      saveBaseline(sensorValue),
      AsyncStorage.removeItem(BACKEND_OFFSET_KEY),
      AsyncStorage.removeItem(BACKEND_OFFSET_DATE_KEY),
      AsyncStorage.removeItem(LAST_RECORDED_STEPS_KEY),
      AsyncStorage.removeItem(LAST_RECORDED_STEPS_DATE_KEY),
      AsyncStorage.setItem(LAST_SENSOR_EVENT_TS_KEY, String(now)),
    ]);
  }, [saveBaseline]);

  /**
   * Reset all baseline state (for logout).
   */
  const resetAll = useCallback(() => {
    baselineRef.current = 0;
    backendOffsetRef.current = 0;
    lastRecordedStepsRef.current = 0;
    lastRecordedInitializedRef.current = false;
    lastSensorEventTimestampRef.current = null;
  }, []);

  return {
    // Refs (exposed for StepContext orchestration)
    baselineRef,
    baselineDateRef,
    backendOffsetRef,

    // Methods
    loadBaseline,
    saveBaseline,
    processSensorEvent,
    getEntryDelta,
    handleNewDay,
    resetAll,
  };
};

export default useStepBaseline;