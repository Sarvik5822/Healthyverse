import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { useUserContext } from './UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UNIT_PREFS_KEY = '@unit_preferences';

export const UnitPreferencesContext = createContext({});

/**
 * Global Unit Preferences Provider
 * 
 * Reads unit preferences from userProfile (backend) and provides them globally.
 * When user changes units in Profile, all screens automatically reflect the change.
 * 
 * Supported preferences:
 * - weightUnit: 'kg' | 'lbs'
 * - heightUnit: 'cm' | 'ft'
 * - waterUnit: 'L' | 'oz' (display) / 'liters' | 'ounces' (API)
 * - waistUnit: 'cm' | 'inches'
 */
export const UnitPreferencesProvider = ({ children }) => {
  const { userProfile } = useUserContext();

  const [preferences, setPreferences] = useState({
    weightUnit: 'kg',
    heightUnit: 'cm',
    waterUnit: 'L', // Display unit: 'L' or 'oz'
    waistUnit: 'cm',
  });

  // Sync preferences from userProfile when it changes
  useEffect(() => {
    if (userProfile) {
      const newPrefs = {
        weightUnit: userProfile.weightUnit || 'kg',
        heightUnit: userProfile.heightUnit || 'cm',
        waterUnit: normalizeWaterUnitForDisplay(userProfile.waterUnit),
        waistUnit: userProfile.waistUnit || 'cm',
      };
      setPreferences(newPrefs);
      // Persist locally for offline access
      AsyncStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(newPrefs)).catch(() => {});
    }
  }, [userProfile]);

  // Load cached preferences on mount (for fast initial render before profile loads)
  useEffect(() => {
    const loadCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(UNIT_PREFS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPreferences((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        // Ignore cache errors
      }
    };
    loadCached();
  }, []);

  /**
   * Update a specific unit preference.
   * This is called from Profile screen when user changes units.
   * The Profile screen should also persist to backend via updateProfile API.
   */
  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      AsyncStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  /**
   * Update multiple unit preferences at once.
   * Called from Profile screen after saving profile with new units.
   * @param {Object} prefs - e.g. { weightUnit: 'lbs', heightUnit: 'ft' }
   */
  const updatePreferences = useCallback((prefs) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...prefs };
      AsyncStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  /**
   * Get the API-compatible water unit from display unit.
   * Display: 'L' -> API: 'liters'
   * Display: 'oz' -> API: 'ounces'
   */
  const getWaterUnitForAPI = useCallback(() => {
    return preferences.waterUnit === 'oz' ? 'ounces' : 'liters';
  }, [preferences.waterUnit]);

  return (
    <UnitPreferencesContext.Provider
      value={{
        ...preferences,
        updatePreference,
        updatePreferences,
        getWaterUnitForAPI,
      }}
    >
      {children}
    </UnitPreferencesContext.Provider>
  );
};

/**
 * Hook to access global unit preferences.
 * 
 * Usage:
 *   const { weightUnit, heightUnit, waterUnit, waistUnit } = useUnitPreferences();
 */
export const useUnitPreferences = () => {
  const context = useContext(UnitPreferencesContext);
  if (!context) {
    throw new Error('useUnitPreferences must be used within a UnitPreferencesProvider');
  }
  return context;
};

// Helper: Normalize water unit from various backend formats to display format
function normalizeWaterUnitForDisplay(unit) {
  if (!unit) return 'L';
  const lower = unit.toLowerCase();
  if (lower === 'ounces' || lower === 'oz') return 'oz';
  return 'L'; // 'liters', 'L', 'l', or anything else defaults to 'L'
}