/**
 * StepService.js
 * 
 * Service layer that bridges the native StepCounterModule with the React Native
 * JavaScript layer. Handles:
 * - Starting/stopping the sensor
 * - Reading sensor values
 * - Permission management
 * - Sensor availability checks
 * - Event subscription management
 */

import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { StepCounterModule } = NativeModules;

// Event emitter for step counter updates
let stepEventEmitter = null;

/**
 * Get or create the NativeEventEmitter instance for step counter events.
 */
const getEmitter = () => {
  if (!stepEventEmitter && StepCounterModule) {
    stepEventEmitter = new NativeEventEmitter(StepCounterModule);
  }
  return stepEventEmitter;
};

/**
 * Check if the step counter sensor is available on this device.
 * @returns {Promise<boolean>}
 */
const isSensorAvailable = async () => {
  try {
    if (Platform.OS !== 'android' || !StepCounterModule) {
      return false;
    }
    return await StepCounterModule.isSensorAvailable();
  } catch (error) {
    console.error('[StepService] isSensorAvailable error:', error);
    return false;
  }
};

/**
 * Check if ACTIVITY_RECOGNITION permission is currently granted.
 * @returns {Promise<boolean>}
 */
const isPermissionGranted = async () => {
  try {
    if (Platform.OS !== 'android') return false;

    // For Android < 10, permission is not required
    if (Platform.Version < 29) return true;

    if (StepCounterModule) {
      return await StepCounterModule.isPermissionGranted();
    }
    return false;
  } catch (error) {
    console.error('[StepService] isPermissionGranted error:', error);
    return false;
  }
};

/**
 * Request ACTIVITY_RECOGNITION permission from the user.
 * @returns {Promise<'granted'|'denied'|'never_ask_again'>}
 */
const requestPermission = async () => {
  try {
    if (Platform.OS !== 'android') return 'denied';

    // For Android < 10, permission is not required
    if (Platform.Version < 29) return 'granted';

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      {
        title: 'Step Counter Permission',
        message:
          'HealthyVerse needs access to your physical activity to count your steps automatically.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    switch (result) {
      case PermissionsAndroid.RESULTS.GRANTED:
        return 'granted';
      case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
        return 'never_ask_again';
      default:
        return 'denied';
    }
  } catch (error) {
    console.error('[StepService] requestPermission error:', error);
    return 'denied';
  }
};

/**
 * Start the step counter sensor.
 * @returns {Promise<boolean>} - true if started successfully
 */
const startStepCounter = async () => {
  try {
    if (Platform.OS !== 'android' || !StepCounterModule) {
      return false;
    }
    await StepCounterModule.startStepCounter();
    return true;
  } catch (error) {
    console.error('[StepService] startStepCounter error:', error);
    return false;
  }
};

/**
 * Stop the step counter sensor.
 * @returns {Promise<boolean>} - true if stopped successfully
 */
const stopStepCounter = async () => {
  try {
    if (Platform.OS !== 'android' || !StepCounterModule) {
      return false;
    }
    await StepCounterModule.stopStepCounter();
    return true;
  } catch (error) {
    console.error('[StepService] stopStepCounter error:', error);
    return false;
  }
};

/**
 * Check if the sensor is currently tracking.
 * @returns {Promise<boolean>}
 */
const isTracking = async () => {
  try {
    if (Platform.OS !== 'android' || !StepCounterModule) {
      return false;
    }
    return await StepCounterModule.isTracking();
  } catch (error) {
    console.error('[StepService] isTracking error:', error);
    return false;
  }
};

/**
 * FIX: Get the last known step count from native module.
 * This is cached in native memory and survives JS reloads.
 * Returns -1 if no step count is available yet.
 * @returns {Promise<number>}
 */
const getLastKnownSteps = async () => {
  try {
    if (Platform.OS !== 'android' || !StepCounterModule) {
      return -1;
    }
    if (!StepCounterModule.getLastKnownSteps) {
      return -1;
    }
    const steps = await StepCounterModule.getLastKnownSteps();
    return steps;
  } catch (error) {
    console.error('[StepService] getLastKnownSteps error:', error);
    return -1;
  }
};

/**
 * Subscribe to step counter updates from the native sensor.
 * @param {function} callback - Called with { steps: number, timestamp: number }
 * @returns {object|null} - Subscription object (call .remove() to unsubscribe)
 */
const subscribeToStepUpdates = (callback) => {
  try {
    const emitter = getEmitter();
    if (!emitter) return null;

    const subscription = emitter.addListener('onStepCounterUpdate', (event) => {
      if (callback && typeof callback === 'function') {
        callback({
          steps: event.steps,
          timestamp: event.timestamp,
        });
      }
    });

    return subscription;
  } catch (error) {
    console.error('[StepService] subscribeToStepUpdates error:', error);
    return null;
  }
};

/**
 * Unsubscribe from step counter updates.
 * @param {object} subscription - The subscription object returned by subscribeToStepUpdates
 */
const unsubscribeFromStepUpdates = (subscription) => {
  try {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  } catch (error) {
    console.error('[StepService] unsubscribeFromStepUpdates error:', error);
  }
};

export default {
  isSensorAvailable,
  isPermissionGranted,
  requestPermission,
  startStepCounter,
  stopStepCounter,
  isTracking,
  getLastKnownSteps,
  subscribeToStepUpdates,
  unsubscribeFromStepUpdates,
};