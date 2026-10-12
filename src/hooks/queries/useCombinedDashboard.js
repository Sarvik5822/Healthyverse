/**
 * Combined Dashboard Query Hook
 *
 * Uses the /api/dashboard/combined endpoint that returns ALL dashboard
 * data in a single request instead of 5-7 separate calls.
 *
 * Benefits:
 * - 5-7 API calls → 1 call
 * - Single loading state
 * - Atomic data (all fields from same timestamp)
 * - ~200ms vs ~800ms dashboard load
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import useHealthStore from '../../store/healthStore';

export const COMBINED_DASHBOARD_KEY = ['dashboard', 'combined'];

/**
 * Fetch all dashboard data in a single API call.
 * This is the PRIMARY hook for DashboardScreen.
 */
export const useCombinedDashboard = (enabled = true) => {
  const setWeightData = useHealthStore((s) => s.setWeightData);
  const setWaterData = useHealthStore((s) => s.setWaterData);
  const setHeartRateData = useHealthStore((s) => s.setHeartRateData);
  const setBpData = useHealthStore((s) => s.setBpData);
  const setGoalsData = useHealthStore((s) => s.setGoalsData);
  const setStepsData = useHealthStore((s) => s.setStepsData);

  const query = useQuery({
    queryKey: COMBINED_DASHBOARD_KEY,
    queryFn: async () => {
      const res = await client.get('/dashboard/combined');
      const data = res.data;

      // Sync to Zustand store for non-query consumers
      if (data.weight) setWeightData(data.weight);
      if (data.water) setWaterData(data.water);
      if (data.heartRate) setHeartRateData(data.heartRate);
      if (data.bloodPressure) setBpData(data.bloodPressure);
      if (data.goals) setGoalsData(data.goals);
      if (data.steps) setStepsData(data.steps);

      return data;
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 5 * 60 * 1000,
    enabled,
  });

  return {
    // Structured data matching DashboardScreen's expected interface
    weightData: query.data?.weight || { weight: 0, bmi: 0, weightUnit: 'kg' },
    waterData: query.data?.water || { intake: 0, goalValue: 3, intakeUnit: 'liters' },
    heartRateData: query.data?.heartRate || { bpm: 0, zone: '' },
    bpData: query.data?.bloodPressure || { systolic: 0, diastolic: 0, status: '' },
    stepsData: query.data?.steps || { steps: 0, distanceKm: 0, calories: 0 },
    goalsData: query.data?.goals || {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetchAll: query.refetch,
    // Raw data for advanced usage
    rawData: query.data,
  };
};

/**
 * Invalidation helper for combined dashboard
 */
export const useInvalidateDashboard = () => {
  const queryClient = useQueryClient();

  return {
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: COMBINED_DASHBOARD_KEY }),
    // Also invalidate individual health queries for screens using them
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: COMBINED_DASHBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  };
};