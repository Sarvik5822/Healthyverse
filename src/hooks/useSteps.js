/**
 * useSteps.js
 * 
 * Custom hook that provides a convenient interface to the StepContext.
 * Use this hook in any component that needs access to step tracking data.
 * 
 * Usage:
 *   const { todaySteps, distance, calories, isTracking, startTracking, stopTracking } = useSteps();
 */

import { useContext, useMemo } from 'react';
import { StepContext } from '../context/StepContext';

/**
 * Hook to access step tracking data and controls.
 * 
 * @returns {object} Step tracking state and methods
 * @property {number} currentSteps - Raw sensor step count since last reboot
 * @property {number} todaySteps - Steps taken today (sensor - baseline)
 * @property {number} goal - Daily step goal
 * @property {number} distance - Distance walked today in km
 * @property {number} calories - Calories burned today
 * @property {boolean} permissionGranted - Whether ACTIVITY_RECOGNITION is granted
 * @property {boolean} isSensorAvailable - Whether step counter sensor exists
 * @property {boolean} isTracking - Whether sensor is currently active
 * @property {boolean} isInitialized - Whether the context has finished initialization
 * @property {number} progress - Goal progress percentage (0-100)
 * @property {number} remaining - Steps remaining to reach goal
 * @property {boolean} goalReached - Whether today's goal has been reached
 * @property {function} startTracking - Start step tracking
 * @property {function} stopTracking - Stop step tracking
 * @property {function} getCurrentStepData - Get current step data for sync
 * @property {function} setGoal - Update the daily step goal
 */
const useSteps = () => {
  const context = useContext(StepContext);

  if (!context) {
    throw new Error('useSteps must be used within a StepProvider');
  }

  const {
    currentSteps,
    todaySteps,
    goal,
    distance,
    calories,
    permissionGranted,
    isSensorAvailable,
    isTracking,
    isInitialized,
    startTracking,
    stopTracking,
    getCurrentStepData,
    setGoal,
  } = context;

  // Derived values
  const progress = useMemo(() => {
    if (!goal || goal <= 0) return 0;
    return Math.min((todaySteps / goal) * 100, 100);
  }, [todaySteps, goal]);

  const remaining = useMemo(() => {
    return Math.max(0, goal - todaySteps);
  }, [todaySteps, goal]);

  const goalReached = useMemo(() => {
    return todaySteps >= goal;
  }, [todaySteps, goal]);

  return {
    // State
    currentSteps,
    todaySteps,
    goal,
    distance,
    calories,
    permissionGranted,
    isSensorAvailable,
    isTracking,
    isInitialized,

    // Derived
    progress,
    remaining,
    goalReached,

    // Methods
    startTracking,
    stopTracking,
    getCurrentStepData,
    setGoal,
  };
};

export default useSteps;