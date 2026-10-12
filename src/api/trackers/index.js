/**
 * Tracker APIs - Barrel Export (UPDATED)
 *
 * Now re-exports from trackerFactory.js (single source of truth).
 * Individual API files (heartRate.js, bloodPressure.js, etc.) are DELETED.
 *
 * Usage:
 *   import { heartRate, bloodPressure } from '../api/trackers';
 *   heartRate.getAll(params);
 *
 * Or use named exports directly from trackerFactory:
 *   import { getHeartRate, addHeartRate } from '../api/trackerFactory';
 */

import {
  heartRateAPI as heartRate,
  bloodPressureAPI as bloodPressure,
  bloodOxygenAPI as bloodOxygen,
  bloodSugarAPI as bloodSugar,
  bodyMetricsAPI as bodyMetrics,
  hydrationAPI as hydration,
  stepsAPI as steps,
  menstrualAPI as menstrual,
} from '../trackerFactory';

export {
  heartRate,
  bloodPressure,
  bloodOxygen,
  bloodSugar,
  bodyMetrics,
  hydration,
  steps,
  menstrual,
};