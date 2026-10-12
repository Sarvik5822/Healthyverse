/**
 * StepSyncService.js
 * 
 * Handles syncing step data to the backend server.
 * 
 * Responsibilities:
 * - Periodic sync every 5 minutes
 * - Sync on app foreground
 * - Sync on internet availability
 * - Sync before logout
 * - Retry logic for failed syncs
 *
 * UPDATED: Imports from trackerFactory (individual API files deleted)
 */

import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addSteps } from '../api/trackerFactory';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const SYNC_INTERVAL_SECONDS = 5 * 60; // 5 minutes in seconds (for countdown UI)
const LAST_SYNC_KEY = '@steps_last_sync';
const PENDING_SYNC_KEY = '@steps_pending_sync';

let syncTimer = null;
let appStateSubscription = null;

/**
 * Sync step data to the backend.
 * @param {object} stepData - { date, totalSteps, distance, calories }
 * @returns {Promise<boolean>} - true if sync was successful
 */
const syncStepsToBackend = async (stepData) => {
  try {
    if (!stepData || stepData.totalSteps === 0) {
      return true; // Nothing to sync
    }

    const payload = {
      date: stepData.date,
      steps: stepData.totalSteps,
      distance: stepData.distance,
      calories: stepData.calories,
    };

    await addSteps(payload);

    // Update last sync timestamp
    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
      timestamp: Date.now(),
      date: stepData.date,
      steps: stepData.totalSteps,
    }));

    // Clear pending sync data
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);

    console.log('[StepSyncService] Sync successful:', payload);
    return true;
  } catch (error) {
    console.error('[StepSyncService] Sync failed:', error);

    // Save as pending sync for retry
    await savePendingSync(stepData);
    return false;
  }
};

/**
 * Save step data for later retry if sync fails.
 * @param {object} stepData
 */
const savePendingSync = async (stepData) => {
  try {
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(stepData));
  } catch (error) {
    console.error('[StepSyncService] Failed to save pending sync:', error);
  }
};

/**
 * Retry syncing any pending step data.
 * @returns {Promise<boolean>}
 */
const retryPendingSync = async () => {
  try {
    const pendingData = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!pendingData) return true;

    const stepData = JSON.parse(pendingData);
    return await syncStepsToBackend(stepData);
  } catch (error) {
    console.error('[StepSyncService] Retry pending sync error:', error);
    return false;
  }
};

/**
 * Get the last sync info.
 * @returns {Promise<object|null>}
 */
const getLastSyncInfo = async () => {
  try {
    const data = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Start the periodic sync timer.
 * @param {function} getStepData - Function that returns current step data
 */
const startPeriodicSync = (getStepData) => {
  stopPeriodicSync(); // Clear any existing timer

  syncTimer = setInterval(async () => {
    try {
      const stepData = getStepData();
      if (stepData && stepData.totalSteps > 0) {
        await syncStepsToBackend(stepData);
      }
    } catch (error) {
      console.error('[StepSyncService] Periodic sync error:', error);
    }
  }, SYNC_INTERVAL);
};

/**
 * Stop the periodic sync timer.
 */
const stopPeriodicSync = () => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
};

/**
 * Start listening for app state changes to sync on foreground.
 * @param {function} getStepData - Function that returns current step data
 */
const startAppStateSync = (getStepData) => {
  stopAppStateSync(); // Remove existing listener

  appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
    if (nextAppState === 'active') {
      // App came to foreground - sync
      try {
        const stepData = getStepData();
        if (stepData && stepData.totalSteps > 0) {
          await syncStepsToBackend(stepData);
        }
        // Also retry any pending syncs
        await retryPendingSync();
      } catch (error) {
        console.error('[StepSyncService] App state sync error:', error);
      }
    }
  });
};

/**
 * Stop listening for app state changes.
 */
const stopAppStateSync = () => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};

/**
 * Perform a final sync before logout.
 * @param {object} stepData - Current step data to sync
 * @returns {Promise<boolean>}
 */
const syncBeforeLogout = async (stepData) => {
  try {
    if (stepData && stepData.totalSteps > 0) {
      return await syncStepsToBackend(stepData);
    }
    return true;
  } catch (error) {
    console.error('[StepSyncService] Sync before logout error:', error);
    return false;
  }
};

/**
 * Initialize all sync mechanisms.
 * @param {function} getStepData - Function that returns current step data
 */
const initialize = (getStepData) => {
  startPeriodicSync(getStepData);
  startAppStateSync(getStepData);
};

/**
 * Clean up all sync mechanisms.
 */
const cleanup = () => {
  stopPeriodicSync();
  stopAppStateSync();
};

export default {
  syncStepsToBackend,
  retryPendingSync,
  getLastSyncInfo,
  startPeriodicSync,
  stopPeriodicSync,
  startAppStateSync,
  stopAppStateSync,
  syncBeforeLogout,
  initialize,
  cleanup,
  SYNC_INTERVAL_SECONDS,
};