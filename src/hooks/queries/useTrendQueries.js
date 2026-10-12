/**
 * React Query Hooks for Trend Data
 * 
 * Period-dependent queries that change based on user selection.
 * Query key includes the period, so changing period = new fetch.
 *
 * UPDATED: Imports from trackerFactory (individual API files deleted)
 */

import { useQuery } from '@tanstack/react-query';
import { getBodyMetricsTrends } from '../../api/trackerFactory';

export const TREND_KEYS = {
  weightTrend: (period) => ['trends', 'weight', period],
};

/**
 * Fetch weight trend data for a given period.
 * Used by: GoalProgressScreen
 */
export const useWeightTrend = (period = 'weekly') => {
  return useQuery({
    queryKey: TREND_KEYS.weightTrend(period),
    queryFn: async () => {
      const res = await getBodyMetricsTrends({ range: period, metric: 'weight' });
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
    staleTime: 2 * 60 * 1000, // Trends are less volatile — 2 min cache
    gcTime: 10 * 60 * 1000,
  });
};