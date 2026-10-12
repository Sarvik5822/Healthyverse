/**
 * useStepSensor.js
 * 
 * Handles step sensor subscription, permission management,
 * and raw sensor event forwarding.
 * Extracted from StepContext for modularity.
 */

import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import StepService from '../services/StepService';

const useStepSensor = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSensorAvailable, setIsSensorAvailable] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const subscriptionRef = useRef(null);

  /**
   * Check if step counter sensor is available on this device.
   */
  const checkSensorAvailability = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    const available = await StepService.isSensorAvailable();
    setIsSensorAvailable(available);
    return available;
  }, []);

  /**
   * Check and request ACTIVITY_RECOGNITION permission.
   * Returns true if permission is granted.
   */
  const requestPermission = useCallback(async () => {
    let hasPermission = await StepService.isPermissionGranted();
    
    if (!hasPermission) {
      const result = await StepService.requestPermission();
      hasPermission = result === 'granted';
    }
    
    setPermissionGranted(hasPermission);
    return hasPermission;
  }, []);

  /**
   * Start the step counter sensor and subscribe to updates.
   * @param {function} onStepUpdate - Callback for each sensor event
   * @returns {boolean} Whether tracking started successfully
   */
  const startSensor = useCallback(async (onStepUpdate) => {
    try {
      const started = await StepService.startStepCounter();
      if (!started) return false;

      // Unsubscribe previous listener if any
      if (subscriptionRef.current) {
        StepService.unsubscribeFromStepUpdates(subscriptionRef.current);
      }

      subscriptionRef.current = StepService.subscribeToStepUpdates(onStepUpdate);
      setIsTracking(true);
      return true;
    } catch (error) {
      console.error('[useStepSensor] startSensor error:', error);
      return false;
    }
  }, []);

  /**
   * Stop the step counter sensor and unsubscribe from updates.
   */
  const stopSensor = useCallback(async () => {
    try {
      await StepService.stopStepCounter();
      
      if (subscriptionRef.current) {
        StepService.unsubscribeFromStepUpdates(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      
      setIsTracking(false);
      return true;
    } catch (error) {
      console.error('[useStepSensor] stopSensor error:', error);
      return false;
    }
  }, []);

  /**
   * Cleanup all sensor resources.
   */
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      StepService.unsubscribeFromStepUpdates(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    StepService.stopStepCounter().catch(() => {});
    setIsTracking(false);
  }, []);

  return {
    // State
    permissionGranted,
    isSensorAvailable,
    isTracking,
    
    // Methods
    checkSensorAvailability,
    requestPermission,
    startSensor,
    stopSensor,
    cleanup,
    setPermissionGranted,
  };
};

export default useStepSensor;