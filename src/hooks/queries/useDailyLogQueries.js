/**
 * React Query Hooks for DailyLog Screen
 * 
 * Replaces the manual fetchLoggedData with unstable useCallback dependencies.
 * 
 * Key fix: Query key includes the date string, so:
 * - Different date = new fetch
 * - Same date = cached data (no API call!)
 * - No dependency on context objects = no infinite loops
 *
 * UPDATED: Imports from trackerFactory (individual API files deleted)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBodyMetrics,
  addBodyMetrics,
  getHydration,
  addHydration,
  getSteps,
  getHeartRate,
  addHeartRate,
  getBloodPressure,
  addBloodPressure,
  getMenstrualEntries,
  addMenstrualEntry,
  updateMenstrualEntry,
} from '../../api/trackerFactory';
import client from '../../api/client';
import dayjs from 'dayjs';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const DAILY_LOG_KEYS = {
  dailyData: (date) => ['dailyLog', 'data', date],
  menstrualStatus: ['dailyLog', 'menstrualStatus'],
};

// ─── Main Daily Log Data Query ────────────────────────────────────────────────

/**
 * Fetch all daily log data for a specific date.
 * 
 * This single hook replaces the entire fetchLoggedData function.
 * The query key includes the date, so changing date = new query.
 * Same date within staleTime = instant cached response.
 * 
 * NO MORE INFINITE LOOPS because:
 * - Query key is a stable string (date)
 * - No dependency on context objects
 * - React Query handles deduplication internally
 */
export const useDailyLogData = (selectedDate, userProfile) => {
  const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
  const isFemale = userProfile?.gender?.toLowerCase() === 'female';

  return useQuery({
    queryKey: DAILY_LOG_KEYS.dailyData(dateStr),
    queryFn: async () => {
      const logged = {};

      // Fire all API calls in parallel
      const apiCalls = [
        getBodyMetrics({ date: dateStr }).catch(() => null),
        getHydration({ date: dateStr }).catch(() => null),
        getSteps({ date: dateStr }).catch(() => null),
        getHeartRate({ date: dateStr }).catch(() => null),
        getBloodPressure({ date: dateStr }).catch(() => null),
      ];

      if (isFemale) {
        apiCalls.push(getMenstrualEntries().catch(() => null));
      }

      const results = await Promise.allSettled(apiCalls);
      const [weightRes, waterRes, stepsRes, hrRes, bpRes, menstrualRes] = results;

      // Process Body Metrics
      if (weightRes.status === 'fulfilled' && weightRes.value) {
        const data = weightRes.value.data;
        const entries = Array.isArray(data) ? data : (data?.entries || []);
        if (entries.length > 0) {
          const latest = entries[0];
          logged.weight = latest.weight || latest.value;
          logged.weightUnit = latest.weightUnit || 'kg';
        }
      }

      // Process Hydration
      if (waterRes.status === 'fulfilled' && waterRes.value) {
        const data = waterRes.value.data;
        const allEntries = Array.isArray(data) ? data : (data?.entries || []);
        const entries = allEntries.filter(entry => {
          const entryDate = dayjs(entry.date).format('YYYY-MM-DD');
          return entryDate === dateStr;
        });
        if (entries.length > 0) {
          const total = entries.reduce((sum, entry) => sum + (entry.waterIntake || entry.intake || entry.value || 0), 0);
          logged.water = total;
          logged.waterUnit = entries[0].waterUnit || 'liters';
        }
      }

      // Process Steps
      if (stepsRes.status === 'fulfilled' && stepsRes.value) {
        const data = stepsRes.value.data;
        const allEntries = Array.isArray(data) ? data : (data?.logs || data?.entries || []);
        const entries = allEntries.filter(entry => {
          const entryDate = dayjs(entry.date).format('YYYY-MM-DD');
          return entryDate === dateStr;
        });
        if (entries.length > 0) {
          const total = entries.reduce((sum, entry) => sum + (entry.steps || entry.value || 0), 0);
          logged.steps = total;
        }
      }

      // Process Heart Rate
      if (hrRes.status === 'fulfilled' && hrRes.value) {
        const data = hrRes.value.data;
        const allEntries = Array.isArray(data) ? data : (data?.entries || []);
        const entries = allEntries.filter(entry => {
          const entryDate = dayjs(entry.date).format('YYYY-MM-DD');
          return entryDate === dateStr;
        });
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          logged.heartRate = latest.bpm || latest.value;
        }
      }

      // Process Blood Pressure
      if (bpRes.status === 'fulfilled' && bpRes.value) {
        const data = bpRes.value.data;
        const allEntries = Array.isArray(data) ? data : (data?.entries || []);
        const entries = allEntries.filter(entry => {
          const entryDate = dayjs(entry.date).format('YYYY-MM-DD');
          return entryDate === dateStr;
        });
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          logged.bp = `${latest.systolic || 0}/${latest.diastolic || 0}`;
        }
      }

      // Process Menstrual
      if (isFemale && menstrualRes && menstrualRes.status === 'fulfilled' && menstrualRes.value) {
        const menstrualData = menstrualRes.value.data;
        if (Array.isArray(menstrualData) && menstrualData.length > 0) {
          const today = dayjs(selectedDate).startOf('day');
          const sortedLogs = [...menstrualData].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

          let activePeriod = null;
          for (const log of sortedLogs) {
            const start = dayjs(log.startDate).startOf('day');
            const end = log.endDate ? dayjs(log.endDate).startOf('day') : null;
            if (start.isBefore(today) || start.isSame(today, 'day')) {
              if (!end || end.isAfter(today) || end.isSame(today, 'day')) {
                activePeriod = log;
                break;
              }
            }
          }

          if (activePeriod) {
            logged.menstrual = activePeriod.flow || 'Active';
            logged._menstrualStatus = {
              isActive: true,
              currentDay: today.diff(dayjs(activePeriod.startDate).startOf('day'), 'day') + 1,
              daysUntilNext: null,
              activeEntryId: activePeriod._id,
            };
          } else {
            // Calculate days until next
            let avgCycleLength = 28;
            try {
              const summaryRes = await client.get('/menstrualLogs/cycleSummary');
              if (summaryRes.data?.averageCycleLength) {
                avgCycleLength = summaryRes.data.averageCycleLength;
              }
            } catch (_e) { /* use default */ }

            const lastPeriod = sortedLogs[0];
            let daysUntilNext = null;
            if (lastPeriod?.startDate) {
              const lastStart = dayjs(lastPeriod.startDate).startOf('day');
              const nextExpected = lastStart.add(avgCycleLength, 'day');
              daysUntilNext = Math.max(0, nextExpected.diff(today, 'day'));
            }

            logged._menstrualStatus = {
              isActive: false,
              currentDay: null,
              daysUntilNext,
              activeEntryId: null,
            };
          }
        } else {
          logged._menstrualStatus = { isActive: false, currentDay: null, daysUntilNext: null, activeEntryId: null };
        }
      }

      return logged;
    },
    staleTime: 60 * 1000, // 1 minute cache — prevents re-fetch on tab switch
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
  });
};

// ─── Mutations (Add Entry + Auto-Invalidate) ──────────────────────────────────

/**
 * Mutation hooks for adding health entries.
 * After successful mutation, automatically invalidates the daily log cache
 * so the UI refreshes with new data.
 */
export const useDailyLogMutations = (selectedDate) => {
  const queryClient = useQueryClient();
  const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');

  const invalidateAfterSave = () => {
    // Invalidate daily log for this date
    queryClient.invalidateQueries({ queryKey: DAILY_LOG_KEYS.dailyData(dateStr) });
    // Also invalidate dashboard health stats
    queryClient.invalidateQueries({ queryKey: ['health'] });
  };

  const addWeightMutation = useMutation({
    mutationFn: (data) => addBodyMetrics(data),
    onSuccess: invalidateAfterSave,
  });

  const addWaterMutation = useMutation({
    mutationFn: (data) => addHydration(data),
    onSuccess: invalidateAfterSave,
  });

  const addHeartRateMutation = useMutation({
    mutationFn: (data) => addHeartRate(data),
    onSuccess: invalidateAfterSave,
  });

  const addBpMutation = useMutation({
    mutationFn: (data) => addBloodPressure(data),
    onSuccess: invalidateAfterSave,
  });

  const addMenstrualMutation = useMutation({
    mutationFn: (data) => addMenstrualEntry(data),
    onSuccess: invalidateAfterSave,
  });

  const updateMenstrualMutation = useMutation({
    mutationFn: ({ id, data }) => updateMenstrualEntry(id, data),
    onSuccess: invalidateAfterSave,
  });

  return {
    addWeight: addWeightMutation,
    addWater: addWaterMutation,
    addHeartRate: addHeartRateMutation,
    addBp: addBpMutation,
    addMenstrual: addMenstrualMutation,
    updateMenstrual: updateMenstrualMutation,
  };
};