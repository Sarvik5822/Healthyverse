/**
 * API CRUD Factory - UPDATED
 *
 * Consolidated tracker API module that replaces individual API files.
 * Matches actual backend route patterns (e.g., /heartRate/addHeartRate, /heartRate/getHeartRate).
 *
 * MIGRATION:
 * - heartRate.js → heartRateAPI
 * - bloodOxygen.js → bloodOxygenAPI
 * - bloodPressure.js → bloodPressureAPI
 * - bloodSugar.js → bloodSugarAPI
 * - hydration.js → hydrationAPI
 * - bodyMetrics.js → bodyMetricsAPI
 * - steps.js → stepsAPI
 * - menstrual.js → menstrualAPI
 *
 * Usage:
 *   import { heartRateAPI } from './trackerFactory';
 *   heartRateAPI.getAll(params);
 *   heartRateAPI.add(data);
 *
 * Or use named exports for backward compatibility:
 *   import { getHeartRate, addHeartRate } from './trackerFactory';
 */

import client from './client';

/**
 * Creates a standard CRUD API object for a tracker endpoint.
 * @param {string} basePath - Base API path (e.g., '/heartRate')
 * @param {object} endpoints - Custom endpoint path mappings
 */
export const createTrackerAPI = (basePath, endpoints = {}) => ({
  getAll: (params) => client.get(`${basePath}/${endpoints.getAll || 'get'}`, { params }),
  getById: (id) => client.get(`${basePath}/${endpoints.getById || 'getById'}/${id}`),
  add: (data) => client.post(`${basePath}/${endpoints.add || 'add'}`, data),
  update: (id, data) => client.put(`${basePath}/${endpoints.update || 'update'}/${id}`, data),
  delete: (id) => client.delete(`${basePath}/${endpoints.delete || 'delete'}/${id}`),
  getTrends: (params) => client.get(`${basePath}/${endpoints.trends || 'trends'}`, { params }),
  getRanges: (params) => client.get(`${basePath}/${endpoints.ranges || 'ranges'}`, { params }),
  getProgress: () => client.get(`${basePath}/${endpoints.progress || 'progress'}`),
  getRecommended: () => client.get(`${basePath}/${endpoints.recommended || 'recommended'}`),
});

// ─── Heart Rate API ───────────────────────────────────────────────────────────
export const heartRateAPI = createTrackerAPI('/heartRate', {
  getAll: 'getHeartRate',
  getById: 'getHeartRateById',
  add: 'addHeartRate',
  update: 'updateHeartRate',
  delete: 'deleteHeartRate',
  trends: 'getHeartRateTrends',
  ranges: 'getHeartRateRanges',
});

// Backward-compatible named exports (drop-in replacement for heartRate.js)
export const getHeartRate = (params) => client.get('/heartRate/getHeartRate', { params });
export const getHeartRateById = (id) => client.get(`/heartRate/getHeartRateById/${id}`);
export const addHeartRate = (data) => client.post('/heartRate/addHeartRate', data);
export const updateHeartRate = (id, data) => client.put(`/heartRate/updateHeartRate/${id}`, data);
export const deleteHeartRate = (id) => client.delete(`/heartRate/deleteHeartRate/${id}`);
export const getHeartRateRanges = () => client.get('/heartRate/getHeartRateRanges');
export const getHeartRateTrends = (params) => client.get('/heartRate/getHeartRateTrends', { params });

// ─── Blood Pressure API ───────────────────────────────────────────────────────
export const bloodPressureAPI = createTrackerAPI('/bloodPressure', {
  getAll: 'getBloodPressure',
  getById: 'getBloodPressureById',
  add: 'addBloodPressure',
  update: 'updateBloodPressure',
  delete: 'deleteBloodPressure',
  trends: 'getBloodPressureTrends',
  ranges: 'getBloodPressureRanges',
});

// Backward-compatible named exports (drop-in replacement for bloodPressure.js)
export const getBloodPressure = (params) => client.get('/bloodPressure/getBloodPressure', { params });
export const getBloodPressureById = (id) => client.get(`/bloodPressure/getBloodPressureById/${id}`);
export const addBloodPressure = (data) => client.post('/bloodPressure/addBloodPressure', data);
export const updateBloodPressure = (id, data) => client.put(`/bloodPressure/updateBloodPressure/${id}`, data);
export const deleteBloodPressure = (id) => client.delete(`/bloodPressure/deleteBloodPressure/${id}`);
export const getBloodPressureRanges = () => client.get('/bloodPressure/getBloodPressureRanges');
export const getBloodPressureTrends = (params) => client.get('/bloodPressure/getBloodPressureTrends', { params });

// ─── Blood Oxygen API ─────────────────────────────────────────────────────────
export const bloodOxygenAPI = createTrackerAPI('/bloodOxygen', {
  getAll: 'getBloodOxygen',
  getById: 'getBloodOxygenById',
  add: 'addBloodOxygen',
  update: 'updateBloodOxygen',
  delete: 'deleteBloodOxygen',
  trends: 'getBloodOxygenTrends',
  ranges: 'getBloodOxygenRanges',
});

// Backward-compatible named exports (drop-in replacement for bloodOxygen.js)
export const getBloodOxygen = (params) => client.get('/bloodOxygen/getBloodOxygen', { params });
export const addBloodOxygen = (data) => client.post('/bloodOxygen/addBloodOxygen', data);
export const updateBloodOxygen = (id, data) => client.put(`/bloodOxygen/updateBloodOxygen/${id}`, data);
export const deleteBloodOxygen = (id) => client.delete(`/bloodOxygen/deleteBloodOxygen/${id}`);
export const getBloodOxygenTrends = (params) => client.get('/bloodOxygen/getBloodOxygenTrends', { params });

// ─── Blood Sugar API ──────────────────────────────────────────────────────────
export const bloodSugarAPI = createTrackerAPI('/bloodSugar', {
  getAll: 'getBloodSugar',
  getById: 'getBloodSugarById',
  add: 'addBloodSugar',
  update: 'updateBloodSugar',
  delete: 'deleteBloodSugar',
  trends: 'getBloodSugarTrends',
  ranges: 'getBloodSugarRanges',
});

// Backward-compatible named exports (drop-in replacement for bloodSugar.js)
export const getBloodSugar = (params) => client.get('/bloodSugar/getBloodSugar', { params });
export const addBloodSugar = (data) => client.post('/bloodSugar/addBloodSugar', data);
export const updateBloodSugar = (id, data) => client.put(`/bloodSugar/updateBloodSugar/${id}`, data);
export const deleteBloodSugar = (id) => client.delete(`/bloodSugar/deleteBloodSugar/${id}`);
export const getBloodSugarTrends = (params) => client.get('/bloodSugar/getBloodSugarTrends', { params });

// ─── Hydration API ────────────────────────────────────────────────────────────
export const hydrationAPI = createTrackerAPI('/hydration', {
  getAll: 'getHydration',
  getById: 'getHydration', // Uses /getHydration/:id
  add: 'addHydration',
  update: 'updateHydration',
  delete: 'deleteHydration',
  trends: 'getHydrationTrends',
  progress: 'progress',
  recommended: 'recommended',
});

// Backward-compatible named exports (drop-in replacement for hydration.js)
export const getHydration = (params) => client.get('/hydration/getHydration', { params });
export const addHydration = (data) => client.post('/hydration/addHydration', data);
export const updateHydration = (id, data) => client.put(`/hydration/updateHydration/${id}`, data);
export const deleteHydration = (id) => client.delete(`/hydration/deleteHydration/${id}`);
export const getHydrationTrends = (params) => client.get('/hydration/getHydrationTrends', { params });
export const getHydrationProgress = () => client.get('/hydration/progress');
export const getRecommendedIntake = () => client.get('/hydration/recommended');

// ─── Body Metrics API ─────────────────────────────────────────────────────────
export const bodyMetricsAPI = createTrackerAPI('/bodyMetrics', {
  getAll: 'getBodyMetrics',
  getById: 'getBodyMetricsById',
  add: 'addBodyMetrics',
  update: 'updateBodyMetrics',
  delete: 'deleteBodyMetrics',
  trends: 'getBodyMetricsTrends',
  progress: 'progress',
});

// Backward-compatible named exports (drop-in replacement for bodyMetrics.js)
export const getBodyMetrics = (params) => client.get('/bodyMetrics/getBodyMetrics', { params });
export const addBodyMetrics = (data) => client.post('/bodyMetrics/addBodyMetrics', data);
export const updateBodyMetrics = (id, data) => client.put(`/bodyMetrics/updateBodyMetrics/${id}`, data);
export const deleteBodyMetrics = (id) => client.delete(`/bodyMetrics/deleteBodyMetrics/${id}`);
export const getBodyMetricsTrends = (params) => client.get('/bodyMetrics/getBodyMetricsTrends', { params });

// ─── Steps API ────────────────────────────────────────────────────────────────
export const stepsAPI = createTrackerAPI('/steps', {
  getAll: 'getSteps',
  getById: 'getStep',
  add: 'addSteps',
  update: 'updateStep',
  delete: 'deleteStep',
  trends: 'getStepsTrends',
  progress: 'progress',
  recommended: 'recommended',
});

// Backward-compatible named exports (drop-in replacement for steps.js)
export const getSteps = (params) => client.get('/steps/getSteps', { params });
export const addSteps = (data) => client.post('/steps/addSteps', data);
export const updateStep = (id, data) => client.put(`/steps/updateStep/${id}`, data);
export const deleteStep = (id) => client.delete(`/steps/deleteStep/${id}`);
export const getStepsTrends = (params) => client.get('/steps/getStepsTrends', { params });
export const getStepsProgress = () => client.get('/steps/progress');
export const getRecommendedSteps = () => client.get('/steps/recommended');
export const syncSteps = (data) => client.post('/steps/addSteps', {
  date: data.date,
  steps: data.totalSteps || data.steps,
  distanceKm: data.distance,
  calories: data.calories,
});

// Step Entries (granular step data)
export const saveStepEntries = (data) => client.post('/steps/entries/save', data);
export const getStepEntries = (params) => client.get('/steps/entries/get', { params });
export const getHourlySummary = (params) => client.get('/steps/entries/hourly', { params });

// ─── Menstrual API ────────────────────────────────────────────────────────────
export const menstrualAPI = createTrackerAPI('/menstrualLogs', {
  getAll: 'getMenstrualLogs',
  getById: 'getMenstrualLogById',
  add: 'addMenstrualLog',
  update: 'updateMenstrualLog',
  delete: 'deleteMenstrualLog',
});

// Backward-compatible named exports (drop-in replacement for menstrual.js)
export const getMenstrualEntries = (params) => client.get('/menstrualLogs/getMenstrualLogs', { params });
export const addMenstrualEntry = (data) => client.post('/menstrualLogs/addMenstrualLog', data);
export const updateMenstrualEntry = (id, data) => client.put(`/menstrualLogs/updateMenstrualLog/${id}`, data);
export const deleteMenstrualEntry = (id) => client.delete(`/menstrualLogs/deleteMenstrualLog/${id}`);
export const getCycleSummary = () => client.get('/menstrualLogs/cycleSummary');
export const getCalendarSnapshot = () => client.get('/menstrualLogs/calendarSnapshot');

export default createTrackerAPI;