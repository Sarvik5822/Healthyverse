/**
 * Generic Tracker Query Hooks (React Query) — WITH PAGINATION
 *
 * Provides reusable query + mutation hooks for ALL tracker screens:
 * - HeartRate, BloodPressure, BloodOxygen, BloodSugar, Hydration, BodyMetrics
 * - Notifications, Menstrual
 *
 * PAGINATION ADDED:
 * - logsQuery now uses useInfiniteQuery for infinite scroll / "Load More"
 * - Backend returns: { logs: [...], pagination: { page, limit, total, totalPages, hasNext } }
 * - Frontend handles both old (raw array) and new (paginated object) response formats
 *
 * Benefits:
 * - Automatic deduplication across screens
 * - Stale-time caching (no re-fetch on tab switch within window)
 * - Background refetch after staleTime
 * - Built-in loading/error states
 * - No infinite loops (stable query keys)
 * - Paginated log history with "Load More" support
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import dayjs from 'dayjs';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const TRACKER_KEYS = {
  heartRate: (date) => ['tracker', 'heartRate', date],
  bloodPressure: (date) => ['tracker', 'bloodPressure', date],
  bloodOxygen: (date) => ['tracker', 'bloodOxygen', date],
  bloodSugar: (date) => ['tracker', 'bloodSugar', date],
  hydration: (date) => ['tracker', 'hydration', date],
  bodyMetrics: (date) => ['tracker', 'bodyMetrics', date],
  menstrual: ['tracker', 'menstrual'],
  menstrualCycleSummary: ['tracker', 'menstrualCycleSummary'],
  notifications: ['notifications'],
};

// ─── Helper: Extract logs from paginated or raw response ──────────────────────

/**
 * Handles both old (raw array) and new ({ logs: [], pagination: {} }) response formats.
 * Returns { logs: [], pagination: {} | null }
 */
const extractPaginatedResponse = (responseData) => {
  // New paginated format: { logs: [...], pagination: {...} }
  if (responseData && responseData.logs && Array.isArray(responseData.logs)) {
    return {
      logs: responseData.logs,
      pagination: responseData.pagination || null,
    };
  }
  // Old format: raw array
  if (Array.isArray(responseData)) {
    return {
      logs: responseData,
      pagination: null,
    };
  }
  // Fallback
  return { logs: [], pagination: null };
};

// ─── Generic Tracker Query Hook Factory ───────────────────────────────────────

/**
 * Creates a date-based tracker query hook.
 * @param {string} key - Tracker identifier (e.g., 'heartRate')
 * @param {string} apiPath - API endpoint path (e.g., '/heartRate/getHeartRate')
 * @param {object} options - Additional options
 */
export const createTrackerQueryHook = (key, apiPath, options = {}) => {
  return (date, enabled = true) => {
    const dateStr = typeof date === 'string' ? date : dayjs(date).format('YYYY-MM-DD');

    return useQuery({
      queryKey: TRACKER_KEYS[key](dateStr),
      queryFn: async () => {
        const res = await client.get(apiPath, { params: { date: dateStr } });
        const { logs } = extractPaginatedResponse(res.data);
        return logs;
      },
      staleTime: options.staleTime || 60 * 1000,
      gcTime: options.gcTime || 5 * 60 * 1000,
      enabled,
    });
  };
};

/**
 * Creates a mutation hook for adding tracker entries.
 * Automatically invalidates the relevant query cache after success.
 */
export const createTrackerMutationHook = (key, apiPath) => {
  return (date) => {
    const queryClient = useQueryClient();
    const dateStr = typeof date === 'string' ? date : dayjs(date).format('YYYY-MM-DD');

    return useMutation({
      mutationFn: (data) => client.post(apiPath, data),
      onSuccess: () => {
        // Invalidate this tracker's cache for the date
        queryClient.invalidateQueries({ queryKey: TRACKER_KEYS[key](dateStr) });
        // Also invalidate dashboard health stats
        queryClient.invalidateQueries({ queryKey: ['health'] });
        // Invalidate daily log
        queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
      },
    });
  };
};

// ─── Specific Tracker Hooks (Date-based) ──────────────────────────────────────

// Heart Rate
export const useHeartRateData = createTrackerQueryHook('heartRate', '/heartRate/getHeartRate');
export const useAddHeartRate = createTrackerMutationHook('heartRate', '/heartRate/addHeartRate');

// Blood Pressure
export const useBloodPressureData = createTrackerQueryHook('bloodPressure', '/bloodPressure/getBloodPressure');
export const useAddBloodPressure = createTrackerMutationHook('bloodPressure', '/bloodPressure/addBloodPressure');

// Blood Oxygen
export const useBloodOxygenData = createTrackerQueryHook('bloodOxygen', '/bloodOxygen/getBloodOxygen');
export const useAddBloodOxygen = createTrackerMutationHook('bloodOxygen', '/bloodOxygen/addBloodOxygen');

// Blood Sugar
export const useBloodSugarData = createTrackerQueryHook('bloodSugar', '/bloodSugar/getBloodSugar');
export const useAddBloodSugar = createTrackerMutationHook('bloodSugar', '/bloodSugar/addBloodSugar');

// Hydration
export const useHydrationData = createTrackerQueryHook('hydration', '/hydration/getHydration');
export const useAddHydration = createTrackerMutationHook('hydration', '/hydration/addHydration');

// Body Metrics
export const useBodyMetricsData = createTrackerQueryHook('bodyMetrics', '/bodyMetrics/getBodyMetrics');
export const useAddBodyMetrics = createTrackerMutationHook('bodyMetrics', '/bodyMetrics/addBodyMetrics');

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SCREEN HOOKS — WITH PAGINATION (useInfiniteQuery for logs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default page size for paginated log queries.
 * Shows 10 items initially, loads 10 more on "Load More".
 */
const LOG_PAGE_SIZE = 10;

/**
 * Complete Heart Rate screen data hook — WITH PAGINATION.
 *
 * Usage in HeartRateScreen:
 *   const {
 *     currentData, logs, trendData, trendLabels, isLoading,
 *     hasMoreLogs, loadMoreLogs, isLoadingMore,
 *     refetchAll, addHeartRate, updateHeartRate, deleteHeartRate
 *   } = useHeartRateScreen(period);
 */
export const useHeartRateScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  // Query 1: Current ranges/analysis
  const rangesQuery = useQuery({
    queryKey: ['tracker', 'heartRate', 'ranges'],
    queryFn: async () => {
      const res = await client.get('/heartRate/getHeartRateRanges');
      const analysis = res.data?.heartRateAnalysis || res.data;
      return {
        bpm: analysis?.bpm || 0,
        zone: analysis?.zone || '',
        condition: analysis?.condition || '',
        range: analysis?.range || '',
        percentOfMHR: analysis?.percentOfMHR || '',
        updated: analysis?.updated || '',
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query 2: Recent logs — PAGINATED with useInfiniteQuery
  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'heartRate', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/heartRate/getHeartRate', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      // Map logs to consistent format
      const mappedLogs = logs.filter(log => log.bpm).map(log => ({
        _id: log._id,
        bpm: parseInt(log.bpm, 10),
        date: log.date,
        timestamp: log.timestamp || '',
        zone: log.zone || '',
      }));
      return {
        logs: mappedLogs,
        pagination: pagination || { page: pageParam, hasNext: false, total: mappedLogs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query 3: Trends (depends on period — changes queryKey when period changes)
  const trendsQuery = useQuery({
    queryKey: ['tracker', 'heartRate', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/heartRate/getHeartRateTrends', { params: { range: period } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.value || item.bpm || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (data) => client.post('/heartRate/addHeartRate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'heartRate'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/heartRate/updateHeartRate/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'heartRate'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/heartRate/deleteHeartRate/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'heartRate'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([
      rangesQuery.refetch(),
      logsQuery.refetch(),
      trendsQuery.refetch(),
    ]);
  };

  // Flatten paginated logs from all pages
  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    currentData: rangesQuery.data || { bpm: 0, zone: '', condition: '', range: '', percentOfMHR: '', updated: '' },
    logs: allLogs,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: rangesQuery.isLoading || logsQuery.isLoading,
    // Pagination controls
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addHeartRate: addMutation,
    updateHeartRate: updateMutation,
    deleteHeartRate: deleteMutation,
  };
};

/**
 * Complete Blood Pressure screen data hook — WITH PAGINATION.
 */
export const useBloodPressureScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  const rangesQuery = useQuery({
    queryKey: ['tracker', 'bloodPressure', 'ranges'],
    queryFn: async () => {
      const res = await client.get('/bloodPressure/getBloodPressureRanges');
      const analysis = res.data?.bloodPressureAnalysis || res.data;
      return {
        systolic: analysis?.systolic || 0,
        diastolic: analysis?.diastolic || 0,
        status: analysis?.status || 'Normal',
        condition: analysis?.condition || '',
        systolicRange: analysis?.systolicRange || '90-120',
        diastolicRange: analysis?.diastolicRange || '60-80',
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'bloodPressure', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/bloodPressure/getBloodPressure', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      const mappedLogs = logs.filter(log => log.systolic).map(log => ({
        _id: log._id,
        systolic: log.systolic,
        diastolic: log.diastolic || 0,
        date: log.date,
        timestamp: log.timestamp || '',
        status: log.status || '',
      }));
      return {
        logs: mappedLogs,
        pagination: pagination || { page: pageParam, hasNext: false, total: mappedLogs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const trendsQuery = useQuery({
    queryKey: ['tracker', 'bloodPressure', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/bloodPressure/getBloodPressureTrends', { params: { range: period } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.systolic || item.value || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => client.post('/bloodPressure/addBloodPressure', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodPressure'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/bloodPressure/updateBloodPressure/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodPressure'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/bloodPressure/deleteBloodPressure/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodPressure'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([rangesQuery.refetch(), logsQuery.refetch(), trendsQuery.refetch()]);
  };

  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    currentData: rangesQuery.data || { systolic: 0, diastolic: 0, status: 'Normal', condition: '', systolicRange: '90-120', diastolicRange: '60-80' },
    logs: allLogs,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: rangesQuery.isLoading || logsQuery.isLoading,
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addBloodPressure: addMutation,
    updateBloodPressure: updateMutation,
    deleteBloodPressure: deleteMutation,
  };
};

/**
 * Complete Hydration screen data hook — WITH PAGINATION.
 */
export const useHydrationScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['tracker', 'hydration', 'progress'],
    queryFn: async () => {
      const res = await client.get('/hydration/getHydrationProgress');
      const curr = res.data?.current || res.data;
      return {
        intake: curr?.intake || curr?.currentIntake || 0,
        goal: curr?.goalValue || curr?.goal || curr?.dailyGoal || 3.0,
        recommended: curr?.recommended || 2.7,
      };
    },
    staleTime: 30 * 1000, // 30s - water changes frequently
    gcTime: 5 * 60 * 1000,
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'hydration', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/hydration/getHydration', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      return {
        logs,
        pagination: pagination || { page: pageParam, hasNext: false, total: logs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const recommendedQuery = useQuery({
    queryKey: ['tracker', 'hydration', 'recommended'],
    queryFn: async () => {
      const res = await client.get('/hydration/getRecommendedIntake');
      return res.data || null;
    },
    staleTime: 5 * 60 * 1000, // 5 min - rarely changes
    gcTime: 10 * 60 * 1000,
  });

  const trendsQuery = useQuery({
    queryKey: ['tracker', 'hydration', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/hydration/getHydrationTrends', { params: { range: period } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.value || item.intake || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => client.post('/hydration/addHydration', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'hydration'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/hydration/updateHydration/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'hydration'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/hydration/deleteHydration/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'hydration'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([progressQuery.refetch(), logsQuery.refetch(), trendsQuery.refetch()]);
  };

  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    progress: progressQuery.data || { intake: 0, goal: 3.0, recommended: 2.7 },
    logs: allLogs,
    recommended: recommendedQuery.data,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: progressQuery.isLoading || logsQuery.isLoading,
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addHydration: addMutation,
    updateHydration: updateMutation,
    deleteHydration: deleteMutation,
  };
};

/**
 * Complete Blood Oxygen screen data hook — WITH PAGINATION.
 */
export const useBloodOxygenScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  const rangesQuery = useQuery({
    queryKey: ['tracker', 'bloodOxygen', 'ranges'],
    queryFn: async () => {
      const res = await client.get('/bloodOxygen/getBloodOxygenRanges');
      const analysis = res.data?.bloodOxygenAnalysis || res.data;
      return {
        spo2: analysis?.spo2 || analysis?.value || 0,
        status: analysis?.status || '',
        condition: analysis?.condition || '',
        range: analysis?.range || '95-100',
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'bloodOxygen', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/bloodOxygen/getBloodOxygen', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      const mappedLogs = logs.filter(log => log.spo2 || log.value).map(log => ({
        _id: log._id,
        spo2: log.spo2 || log.value || 0,
        date: log.date,
        timestamp: log.timestamp || '',
        status: log.status || '',
      }));
      return {
        logs: mappedLogs,
        pagination: pagination || { page: pageParam, hasNext: false, total: mappedLogs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const trendsQuery = useQuery({
    queryKey: ['tracker', 'bloodOxygen', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/bloodOxygen/getBloodOxygenTrends', { params: { range: period } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.value || item.spo2 || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => client.post('/bloodOxygen/addBloodOxygen', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodOxygen'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/bloodOxygen/updateBloodOxygen/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodOxygen'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/bloodOxygen/deleteBloodOxygen/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodOxygen'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([rangesQuery.refetch(), logsQuery.refetch(), trendsQuery.refetch()]);
  };

  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    currentData: rangesQuery.data || { spo2: 0, status: '', condition: '', range: '95-100' },
    logs: allLogs,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: rangesQuery.isLoading || logsQuery.isLoading,
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addBloodOxygen: addMutation,
    updateBloodOxygen: updateMutation,
    deleteBloodOxygen: deleteMutation,
  };
};

/**
 * Complete Blood Sugar screen data hook — WITH PAGINATION.
 */
export const useBloodSugarScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  const rangesQuery = useQuery({
    queryKey: ['tracker', 'bloodSugar', 'ranges'],
    queryFn: async () => {
      const res = await client.get('/bloodSugar/getBloodSugarRanges');
      const analysis = res.data?.bloodSugarAnalysis || res.data;
      return {
        glucose: analysis?.glucose || analysis?.value || 0,
        status: analysis?.status || '',
        condition: analysis?.condition || '',
        range: analysis?.range || '70-100',
        mealContext: analysis?.mealContext || '',
      };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'bloodSugar', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/bloodSugar/getBloodSugar', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      const mappedLogs = logs.filter(log => log.glucose || log.value).map(log => ({
        _id: log._id,
        glucose: log.glucose || log.value || 0,
        date: log.date,
        timestamp: log.timestamp || '',
        status: log.status || '',
        mealContext: log.mealContext || '',
      }));
      return {
        logs: mappedLogs,
        pagination: pagination || { page: pageParam, hasNext: false, total: mappedLogs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const trendsQuery = useQuery({
    queryKey: ['tracker', 'bloodSugar', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/bloodSugar/getBloodSugarTrends', { params: { range: period } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.value || item.glucose || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => client.post('/bloodSugar/addBloodSugar', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodSugar'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/bloodSugar/updateBloodSugar/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodSugar'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/bloodSugar/deleteBloodSugar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bloodSugar'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([rangesQuery.refetch(), logsQuery.refetch(), trendsQuery.refetch()]);
  };

  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    currentData: rangesQuery.data || { glucose: 0, status: '', condition: '', range: '70-100', mealContext: '' },
    logs: allLogs,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: rangesQuery.isLoading || logsQuery.isLoading,
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addBloodSugar: addMutation,
    updateBloodSugar: updateMutation,
    deleteBloodSugar: deleteMutation,
  };
};

/**
 * Complete Body Metrics screen data hook — WITH PAGINATION.
 */
export const useBodyMetricsScreen = (period = 'weekly') => {
  const queryClient = useQueryClient();

  const currentQuery = useQuery({
    queryKey: ['tracker', 'bodyMetrics', 'current'],
    queryFn: async () => {
      const res = await client.get('/bodyMetrics/getBodyMetrics', { params: { page: 1, limit: 1 } });
      const { logs } = extractPaginatedResponse(res.data);
      if (logs.length > 0) {
        const latest = logs[0];
        return {
          weight: latest.weight || 0,
          height: latest.height || 0,
          bmi: latest.bmi || 0,
          bodyFat: latest.bodyFat || 0,
          waistCircumference: latest.waistCircumference || 0,
          weightUnit: latest.weightUnit || 'kg',
          heightUnit: latest.heightUnit || 'cm',
        };
      }
      return { weight: 0, height: 0, bmi: 0, bodyFat: 0, waistCircumference: 0, weightUnit: 'kg', heightUnit: 'cm' };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const logsQuery = useInfiniteQuery({
    queryKey: ['tracker', 'bodyMetrics', 'logs'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await client.get('/bodyMetrics/getBodyMetrics', {
        params: { page: pageParam, limit: LOG_PAGE_SIZE },
      });
      const { logs, pagination } = extractPaginatedResponse(res.data);
      return {
        logs,
        pagination: pagination || { page: pageParam, hasNext: false, total: logs.length },
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return (lastPage.pagination.page || 1) + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const trendsQuery = useQuery({
    queryKey: ['tracker', 'bodyMetrics', 'trends', period],
    queryFn: async () => {
      const res = await client.get('/bodyMetrics/getBodyMetricsTrends', { params: { range: period, metric: 'weight' } });
      if (res.data && Array.isArray(res.data)) {
        const labels = res.data.map(item => {
          if (item.label) return item.label;
          if (item.date) {
            const d = new Date(item.date);
            return period === 'monthly'
              ? `Week ${item.week || Math.ceil(d.getDate() / 7)}`
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          }
          return '';
        });
        const data = res.data.map(item => item.value || item.weight || 0);
        return { labels, data };
      }
      return { labels: [], data: [] };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data) => client.post('/bodyMetrics/addBodyMetrics', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bodyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/bodyMetrics/updateBodyMetrics/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bodyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/bodyMetrics/deleteBodyMetrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracker', 'bodyMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLog'] });
    },
  });

  const refetchAll = async () => {
    await Promise.all([currentQuery.refetch(), logsQuery.refetch(), trendsQuery.refetch()]);
  };

  const allLogs = logsQuery.data?.pages?.flatMap(page => page.logs) || [];

  return {
    currentData: currentQuery.data || { weight: 0, height: 0, bmi: 0, bodyFat: 0, waistCircumference: 0, weightUnit: 'kg', heightUnit: 'cm' },
    logs: allLogs,
    trendData: trendsQuery.data?.data || [],
    trendLabels: trendsQuery.data?.labels || [],
    isLoading: currentQuery.isLoading || logsQuery.isLoading,
    hasMoreLogs: logsQuery.hasNextPage || false,
    loadMoreLogs: logsQuery.fetchNextPage,
    isLoadingMore: logsQuery.isFetchingNextPage || false,
    totalLogs: logsQuery.data?.pages?.[0]?.pagination?.total || allLogs.length,
    refetchAll,
    addBodyMetrics: addMutation,
    updateBodyMetrics: updateMutation,
    deleteBodyMetrics: deleteMutation,
  };
};

// ─── Non-Date-Based Hooks ─────────────────────────────────────────────────────

/**
 * Notifications query hook
 */
export const useNotifications = (enabled = true) => {
  return useQuery({
    queryKey: TRACKER_KEYS.notifications,
    queryFn: async () => {
      const res = await client.get('/notifications');
      return res.data?.notifications || res.data || [];
    },
    staleTime: 30 * 1000, // 30s - notifications should be fresher
    gcTime: 5 * 60 * 1000,
    enabled,
  });
};

/**
 * Menstrual data query hook
 */
export const useMenstrualData = (enabled = true) => {
  return useQuery({
    queryKey: TRACKER_KEYS.menstrual,
    queryFn: async () => {
      const res = await client.get('/menstrualLogs/getMenstrualLogs');
      return res.data || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
  });
};

/**
 * Menstrual cycle summary query hook
 */
export const useMenstrualCycleSummary = (enabled = true) => {
  return useQuery({
    queryKey: TRACKER_KEYS.menstrualCycleSummary,
    queryFn: async () => {
      const res = await client.get('/menstrualLogs/cycleSummary');
      return res.data || {};
    },
    staleTime: 5 * 60 * 1000, // 5 min - rarely changes
    gcTime: 10 * 60 * 1000,
    enabled,
  });
};

// ─── Invalidation Helper ──────────────────────────────────────────────────────

/**
 * Hook to get invalidation functions for all trackers.
 */
export const useInvalidateTrackers = () => {
  const queryClient = useQueryClient();

  return {
    invalidateTracker: (key, date) => {
      const dateStr = typeof date === 'string' ? date : dayjs(date).format('YYYY-MM-DD');
      queryClient.invalidateQueries({ queryKey: TRACKER_KEYS[key](dateStr) });
    },
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.notifications }),
    invalidateMenstrual: () => queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.menstrual }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['tracker'] }),
  };
};