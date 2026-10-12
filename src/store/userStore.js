/**
 * User Store (Zustand)
 * 
 * Lightweight store for unit preferences and user profile data
 * that multiple components need without causing re-renders.
 * 
 * NOTE: This does NOT replace UserContext entirely (auth flow stays in Context).
 * This provides stable references for unit preferences that were causing
 * re-render cascades through UnitPreferencesContext.
 */

import { create } from 'zustand';

const useUserStore = create((set, get) => ({
  // ─── Unit Preferences ───────────────────────────────────────────────────
  weightUnit: 'kg',
  heightUnit: 'cm',
  waterUnit: 'L',
  waistUnit: 'cm',

  // ─── Actions ────────────────────────────────────────────────────────────

  /**
   * Sync preferences from userProfile
   */
  syncFromProfile: (userProfile) => {
    if (!userProfile) return;
    set({
      weightUnit: userProfile.weightUnit || 'kg',
      heightUnit: userProfile.heightUnit || 'cm',
      waterUnit: normalizeWaterUnit(userProfile.waterUnit),
      waistUnit: userProfile.waistUnit || 'cm',
    });
  },

  /**
   * Update a single preference
   */
  updatePreference: (key, value) => {
    set({ [key]: value });
  },

  /**
   * Update multiple preferences at once
   */
  updatePreferences: (prefs) => {
    set(prefs);
  },

  /**
   * Get API-compatible water unit
   */
  getWaterUnitForAPI: () => {
    return get().waterUnit === 'oz' ? 'ounces' : 'liters';
  },
}));

// Helper
function normalizeWaterUnit(unit) {
  if (!unit) return 'L';
  const lower = unit.toLowerCase();
  if (lower === 'ounces' || lower === 'oz') return 'oz';
  return 'L';
}

export default useUserStore;