/**
 * React Query Hooks for Health Data
 * 
 * These hooks replace the manual fetchAllHealthData pattern in HealthDataContext.
 * 
 * Benefits:
 * - Automatic deduplication: If Dashboard and GoalProgress both call useWeightStats(),
 *   only ONE network request is made.
 * - Stale-time caching: Within 30s, switching tabs returns cached data instantly.
 * - Background refetch: After staleTime, data is refetched in background.
 * - No infinite loops: Query keys are stable strings/arrays.
 * - Built-in loading/error states.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWeightAndBMIStats, getWaterIntakeStats } from '../../api/dashboard';
import { getHeartRateRanges, getBloodPressureRanges, getStepsProgress } from '../../api/trackerFactory';
import { getGoals } from '../../api/goals';
import useHealthStore from '../../store/healthStore';

// ─── Query Keys (stable references) ──────────────────────────────────────────

export const HEALTH_QUERY_KEYS = {
  weightStats: ['health', 'weightStats'],
  waterStats: ['health', 'waterStats'],
  heartRateRanges: ['health', 'heartRateRanges'],
  bpRanges: ['health', 'bpRanges'],
  goals: ['health', 'goals'],
  stepsProgress: ['health', 'stepsProgress'],
};

// ─── Individual Query Hooks ───────────────────────────────────────────────────

/**
 * Fetch weight & BMI stats.
 * Used by: Dashboard, GoalProgress
 * Deduplication: Same queryKey = single network call shared across components
 */
export const useWeightStats = (enabled = true) => {
  const setWeightData = useHealthStore((s) => s.setWeightData);

  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.weightStats,
    queryFn: async () => {
      const res = await getWeightAndBMIStats();
      const data = res.data;
      // Sync to Zustand store for non-query consumers
      setWeightData(data);
      return data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

/**
 * Fetch water intake stats.
 * Used by: Dashboard, GoalProgress, DailyLog
 */
export const useWaterStats = (enabled = true) => {
  const setWaterData = useHealthStore((s) => s.setWaterData);

  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.waterStats,
    queryFn: async () => {
      const res = await getWaterIntakeStats();
      const data = res.data;
      setWaterData(data);
      return data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

/**
 * Fetch heart rate ranges/analysis.
 * Used by: Dashboard
 */
export const useHeartRateRanges = (enabled = true) => {
  const setHeartRateData = useHealthStore((s) => s.setHeartRateData);

  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.heartRateRanges,
    queryFn: async () => {
      const res = await getHeartRateRanges();
      const data = res.data;
      setHeartRateData(data);
      return data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

/**
 * Fetch blood pressure ranges/analysis.
 * Used by: Dashboard
 */
export const useBpRanges = (enabled = true) => {
  const setBpData = useHealthStore((s) => s.setBpData);

  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.bpRanges,
    queryFn: async () => {
      const res = await getBloodPressureRanges();
      const data = res.data;
      setBpData(data);
      return data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

/**
 * Fetch user goals.
 * Used by: GoalProgress, Dashboard
 */
export const useGoals = (enabled = true) => {
  const setGoalsData = useHealthStore((s) => s.setGoalsData);

  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.goals,
    queryFn: async () => {
      const res = await getGoals();
      const data = res.data;
      setGoalsData(data);
      return data;
    },
    staleTime: 60 * 1000, // Goals change less frequently
    enabled,
  });
};

/**
 * Fetch steps progress.
 * Used by: StepContext initialization
 */
export const useStepsProgress = (enabled = true) => {
  return useQuery({
    queryKey: HEALTH_QUERY_KEYS.stepsProgress,
    queryFn: async () => {
      const res = await getStepsProgress();
      return res.data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

// ─── Combined Hook (replaces fetchAllHealthData) ──────────────────────────────

/**
 * Fetch all health dashboard data in parallel.
 * React Query automatically deduplicates — if any of these are already
 * being fetched by another component, it won't make duplicate calls.
 * 
 * Replaces: HealthDataContext.fetchAllHealthData()
 */
export const useAllHealthData = (enabled = true) => {
  const weightQuery = useWeightStats(enabled);
  const waterQuery = useWaterStats(enabled);
  const heartRateQuery = useHeartRateRanges(enabled);
  const bpQuery = useBpRanges(enabled);
  const goalsQuery = useGoals(enabled);

  const isLoading = weightQuery.isLoading || waterQuery.isLoading ||
    heartRateQuery.isLoading || bpQuery.isLoading || goalsQuery.isLoading;

  const isError = weightQuery.isError && waterQuery.isError &&
    heartRateQuery.isError && bpQuery.isError && goalsQuery.isError;

  return {
    weightData: weightQuery.data || { weight: 0, bmi: 0, weightUnit: 'kg' },
    waterData: waterQuery.data || { intake: 0, goalValue: 3, intakeUnit: 'liters' },
    heartRateData: heartRateQuery.data || {},
    bpData: bpQuery.data || {},
    goalsData: goalsQuery.data || {},
    isLoading,
    isError,
    // Refetch all (for pull-to-refresh)
    refetchAll: async () => {
      await Promise.allSettled([
        weightQuery.refetch(),
        waterQuery.refetch(),
        heartRateQuery.refetch(),
        bpQuery.refetch(),
        goalsQuery.refetch(),
      ]);
    },
  };
};

// ─── Invalidation Helper ──────────────────────────────────────────────────────

/**
 * Hook to get invalidation functions.
 * Call after adding new entries to refresh relevant data.
 */
export const useInvalidateHealth = () => {
  const queryClient = useQueryClient();

  return {
    invalidateWeight: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.weightStats }),
    invalidateWater: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.waterStats }),
    invalidateHeartRate: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.heartRateRanges }),
    invalidateBp: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.bpRanges }),
    invalidateGoals: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.goals }),
    invalidateSteps: () => queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEYS.stepsProgress }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['health'] }),
  };
};