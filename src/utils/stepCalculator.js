/**
 * stepCalculator.js
 * 
 * Utility functions for calculating distance and calories from step data.
 * Uses user's body metrics (height, weight) for accurate calculations.
 * 
 * Formulas:
 * - Distance: steps × (height_in_meters × 0.415) → km
 * - Calories: steps × weight_in_kg × 0.0005 (primary)
 *             steps × 0.04 (fallback when weight unavailable)
 */

/**
 * Calculate distance walked based on steps and user height.
 * 
 * Formula: steps × strideLength
 * Stride length = height (meters) × 0.415
 * 
 * @param {number} steps - Number of steps taken
 * @param {number|null} heightCm - User's height in centimeters
 * @returns {number} - Distance in kilometers (rounded to 2 decimal places)
 */
const calculateDistance = (steps, heightCm = null) => {
  if (!steps || steps <= 0) return 0;

  // Default height: 170cm if not provided
  const height = heightCm || 170;
  const heightInMeters = height / 100;

  // Stride length formula: height × 0.415
  const strideLengthMeters = heightInMeters * 0.415;

  // Distance in meters, then convert to km
  const distanceMeters = steps * strideLengthMeters;
  const distanceKm = distanceMeters / 1000;

  return Math.round(distanceKm * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate calories burned based on steps and user weight.
 * 
 * Primary formula: steps × weight (kg) × 0.0005
 * Fallback formula: steps × 0.04 (when weight is unavailable)
 * 
 * @param {number} steps - Number of steps taken
 * @param {number|null} weightKg - User's weight in kilograms
 * @returns {number} - Calories burned (rounded to nearest integer)
 */
const calculateCalories = (steps, weightKg = null) => {
  if (!steps || steps <= 0) return 0;

  if (weightKg && weightKg > 0) {
    // Primary formula: steps × weight × constant
    return Math.round(steps * weightKg * 0.0005);
  }

  // Fallback formula: steps × 0.04
  return Math.round(steps * 0.04);
};

/**
 * Calculate all step metrics at once.
 * 
 * @param {number} steps - Number of steps taken
 * @param {object} userMetrics - User body metrics
 * @param {number|null} userMetrics.heightCm - Height in cm
 * @param {number|null} userMetrics.weightKg - Weight in kg
 * @returns {object} - { steps, distance, calories }
 */
const calculateStepMetrics = (steps, userMetrics = {}) => {
  const { heightCm = null, weightKg = null } = userMetrics;

  return {
    steps: steps || 0,
    distance: calculateDistance(steps, heightCm),
    calories: calculateCalories(steps, weightKg),
  };
};

/**
 * Get today's date string in YYYY-MM-DD format.
 * @returns {string}
 */
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a given date string is today.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
const isToday = (dateStr) => {
  return dateStr === getTodayDateString();
};

export {
  calculateDistance,
  calculateCalories,
  calculateStepMetrics,
  getTodayDateString,
  isToday,
};

export default {
  calculateDistance,
  calculateCalories,
  calculateStepMetrics,
  getTodayDateString,
  isToday,
};