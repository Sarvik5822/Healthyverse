/**
 * Zustand Health Store
 *
 * Lightweight global state for health data that doesn't need React Query.
 * Used by components that need to read latest values without subscribing to queries.
 *
 * React Query hooks (useWeightStats, etc.) sync data here via onSuccess callbacks.
 * Non-query consumers (like DailyLogScreen's local calculations) read from here.
 *
 * Benefits over Context:
 * - No Provider nesting required
 * - No re-render cascading (only subscribed selectors re-render)
 * - Simpler API
 * - Works outside React tree (e.g., in API interceptors)
 */

import { create } from 'zustand';

const useHealthStore = create((set) => ({
  // ─── Steps (from hardware sensor — always latest) ─────────────────────────
  stepsData: { steps: 0, goal: 10000 },
  setStepsData: (data) => set({
    stepsData: {
      steps: data?.steps || 0,
      goal: data?.goal || data?.dailyGoal || 10000,
    },
  }),

  // ─── Weight ───────────────────────────────────────────────────────────────
  weightData: { weight: 0, bmi: 0, weightUnit: 'kg' },
  setWeightData: (data) => set({
    weightData: {
      weight: data?.weight || 0,
      bmi: data?.bmi || 0,
      weightUnit: data?.weightUnit || 'kg',
    },
  }),

  // ─── Water ────────────────────────────────────────────────────────────────
  waterData: { intake: 0, goal: 3, intakeUnit: 'liters' },
  setWaterData: (data) => set({
    waterData: {
      intake: data?.intake || 0,
      goal: data?.goalValue || data?.goal || 3,
      intakeUnit: data?.intakeUnit || 'liters',
    },
  }),

  // ─── Heart Rate ───────────────────────────────────────────────────────────
  heartRateData: { bpm: 0, zone: '' },
  setHeartRateData: (data) => set({
    heartRateData: {
      bpm: data?.heartRateAnalysis?.value || data?.heartRateAnalysis?.bpm || data?.value || data?.bpm || 0,
      zone: data?.heartRateAnalysis?.zone || data?.zone || data?.status || '',
    },
  }),

  // ─── Blood Pressure ───────────────────────────────────────────────────────
  bpData: { systolic: 0, diastolic: 0, status: '' },
  setBpData: (data) => set({
    bpData: {
      systolic: data?.bloodPressureAnalysis?.systolic?.value || data?.systolic || 0,
      diastolic: data?.bloodPressureAnalysis?.diastolic?.value || data?.diastolic || 0,
      status: data?.bloodPressureAnalysis?.status || data?.status || '',
    },
  }),

  // ─── Goals ────────────────────────────────────────────────────────────────
  goalsData: {},
  setGoalsData: (data) => set({ goalsData: data || {} }),

  // ─── User Preferences (merged from UnitPreferencesContext) ────────────────
  unitPreferences: {
    weightUnit: 'kg',
    heightUnit: 'cm',
    waterUnit: 'liters',
    temperatureUnit: 'celsius',
  },
  setUnitPreferences: (prefs) => set((state) => ({
    unitPreferences: { ...state.unitPreferences, ...prefs },
  })),
}));

export default useHealthStore;