/**
 * StepEntryService.js
 *
 * Google Fit-style step entry recording with TIME WINDOWS and VALIDATION.
 *
 * KEY VALIDATION: A single sensor event should NEVER have more than 500 steps.
 * Normal walking = ~2 steps/second, sensor batches every 5-60 seconds.
 * Max realistic = ~120 steps per batch. We use 500 as generous threshold.
 * 
 * Entries exceeding this threshold are REJECTED as cumulative bug artifacts.
 *
 * For hourly chart display, uses PROPORTIONAL DISTRIBUTION (linear interpolation):
 * If a walking window straddles two hours (e.g., 08:45 to 09:15 with 300 steps),
 * it splits proportionally:
 * - Hour 8: 15/30 * 300 = 150 steps
 * - Hour 9: 15/30 * 300 = 150 steps
 *
 * UPDATED: Imports from trackerFactory (individual API files deleted)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveStepEntries } from '../api/trackerFactory';
import dayjs from 'dayjs';

const ENTRIES_KEY_PREFIX = '@step_entries_';
const LAST_ENTRY_SYNC_KEY = '@step_entries_last_sync';
const LAST_EVENT_TIMESTAMP_KEY = '@step_entries_last_event_ts';

// Maximum steps allowed in a single entry.
// Anything above this is considered a cumulative bug and rejected.
// Normal sensor batch: 1-120 steps. Generous threshold: 500.
const MAX_SINGLE_ENTRY_STEPS = 500;

/**
 * Get the storage key for a specific date's entries.
 */
const getEntriesKey = (date) => `${ENTRIES_KEY_PREFIX}${date}`;

/**
 * Record a new step entry with time window (Google Fit style).
 *
 * VALIDATION: Rejects entries where steps > MAX_SINGLE_ENTRY_STEPS (500).
 * This prevents the cumulative bug from corrupting the database.
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @param {number} steps - Steps in this interval (delta)
 * @param {number} startTimestamp - Unix timestamp in ms when this window started
 * @param {number} endTimestamp - Unix timestamp in ms when this window ended
 */
const recordEntry = async (date, steps, startTimestamp, endTimestamp) => {
  try {
    if (steps <= 0) return;

    // CRITICAL VALIDATION: Reject suspiciously large entries (cumulative bug)
    if (steps > MAX_SINGLE_ENTRY_STEPS) {
      console.warn(
        `[StepEntryService] REJECTED entry: ${steps} steps at ${dayjs(startTimestamp).format('HH:mm')} ` +
        `(exceeds max ${MAX_SINGLE_ENTRY_STEPS}, likely cumulative bug)`
      );
      return;
    }

    // If no endTimestamp provided, use startTimestamp (point-in-time entry)
    const effectiveEnd = endTimestamp || startTimestamp;

    const key = getEntriesKey(date);
    const time = dayjs(startTimestamp).format('HH:mm');

    const entry = {
      time,
      steps,
      timestamp: startTimestamp,
      startTimestamp,
      endTimestamp: effectiveEnd,
    };

    // Get existing entries
    const existing = await AsyncStorage.getItem(key);
    let entries = existing ? JSON.parse(existing) : [];

    // Check if we already have an entry at this exact startTimestamp
    const existingIndex = entries.findIndex(e => e.startTimestamp === startTimestamp || e.timestamp === startTimestamp);
    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
    }

    // Keep entries sorted by startTimestamp
    entries.sort((a, b) => (a.startTimestamp || a.timestamp) - (b.startTimestamp || b.timestamp));

    await AsyncStorage.setItem(key, JSON.stringify(entries));

    // Save last event timestamp for time window tracking
    await AsyncStorage.setItem(LAST_EVENT_TIMESTAMP_KEY, String(effectiveEnd));
  } catch (error) {
    console.error('[StepEntryService] recordEntry error:', error);
  }
};

/**
 * Get the last event timestamp (used for calculating time windows).
 * @returns {number|null} - Last event timestamp in ms, or null
 */
const getLastEventTimestamp = async () => {
  try {
    const val = await AsyncStorage.getItem(LAST_EVENT_TIMESTAMP_KEY);
    return val ? parseInt(val, 10) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Get all entries for a specific date from local storage.
 * FILTERS OUT corrupted entries (steps > MAX_SINGLE_ENTRY_STEPS).
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Array} - Array of { time, steps, timestamp, startTimestamp, endTimestamp }
 */
const getLocalEntries = async (date) => {
  try {
    const key = getEntriesKey(date);
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    
    const entries = JSON.parse(data);
    
    // Filter out corrupted entries (cumulative bug artifacts)
    return entries.filter(entry => entry.steps > 0 && entry.steps <= MAX_SINGLE_ENTRY_STEPS);
  } catch (error) {
    console.error('[StepEntryService] getLocalEntries error:', error);
    return [];
  }
};

/**
 * Google Fit-style PROPORTIONAL HOURLY BUCKETIZATION.
 *
 * For each entry with a time window (startTimestamp → endTimestamp):
 * 1. Calculate which hourly buckets (0-23) the window overlaps
 * 2. For entries that straddle multiple hours, distribute steps proportionally
 *    based on how much time falls in each hour bucket
 *
 * Example:
 * Entry: 08:45 → 09:15, 300 steps (30 min window)
 * - Hour 8: 15 min overlap → 15/30 * 300 = 150 steps
 * - Hour 9: 15 min overlap → 15/30 * 300 = 150 steps
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Array} - Array of { hour: 0-23, steps: number }
 */
const getLocalHourlyData = async (date) => {
  try {
    const entries = await getLocalEntries(date);
    const hourlyMap = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = 0;
    }

    entries.forEach((entry) => {
      const start = entry.startTimestamp || entry.timestamp;
      const end = entry.endTimestamp || entry.startTimestamp || entry.timestamp;
      const steps = entry.steps;

      // If start === end (point-in-time entry), assign all steps to that hour
      if (!end || start === end || (end - start) < 1000) {
        const hour = parseInt(dayjs(start).format('HH'), 10);
        hourlyMap[hour] += steps;
        return;
      }

      // Time-window entry: apply proportional distribution (linear interpolation)
      const totalDurationMs = end - start;

      // Get the hour boundaries this window spans
      const startHour = dayjs(start).hour();
      const endHour = dayjs(end).hour();

      if (startHour === endHour) {
        // Entire window is within one hour — no splitting needed
        hourlyMap[startHour] += steps;
      } else {
        // Window straddles multiple hours — proportional distribution
        const stepsPerMs = steps / totalDurationMs;

        for (let hour = startHour; hour <= endHour; hour++) {
          const bucketStart = dayjs(start).startOf('day').add(hour, 'hour').valueOf();
          const bucketEnd = dayjs(start).startOf('day').add(hour + 1, 'hour').valueOf();

          // Intersection: max(entryStart, bucketStart) to min(entryEnd, bucketEnd)
          const overlapStart = Math.max(start, bucketStart);
          const overlapEnd = Math.min(end, bucketEnd);
          const overlapMs = Math.max(0, overlapEnd - overlapStart);

          if (overlapMs > 0) {
            const proportionalSteps = Math.round(stepsPerMs * overlapMs);
            hourlyMap[hour] += proportionalSteps;
          }
        }
      }
    });

    return Object.keys(hourlyMap).map((hour) => ({
      hour: parseInt(hour, 10),
      steps: hourlyMap[hour],
    }));
  } catch (error) {
    console.error('[StepEntryService] getLocalHourlyData error:', error);
    return Array.from({ length: 24 }, (_, i) => ({ hour: i, steps: 0 }));
  }
};

/**
 * Sync local entries to the backend.
 * Only syncs valid entries (steps <= MAX_SINGLE_ENTRY_STEPS).
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {boolean} - true if sync was successful
 */
const syncEntriesToBackend = async (date) => {
  try {
    const entries = await getLocalEntries(date); // Already filtered
    if (entries.length === 0) return true;

    await saveStepEntries({ date, entries });

    // Update last sync timestamp
    await AsyncStorage.setItem(LAST_ENTRY_SYNC_KEY, JSON.stringify({
      timestamp: Date.now(),
      date,
      count: entries.length,
    }));

    return true;
  } catch (error) {
    console.error('[StepEntryService] syncEntriesToBackend error:', error);
    return false;
  }
};

/**
 * Clean up old entries (older than 30 days) to save storage.
 * Also removes corrupted entries from local storage.
 */
const cleanupOldEntries = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const entryKeys = keys.filter(k => k.startsWith(ENTRIES_KEY_PREFIX));
    const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

    const keysToRemove = entryKeys.filter(key => {
      const date = key.replace(ENTRIES_KEY_PREFIX, '');
      return date < thirtyDaysAgo;
    });

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }

    // Also clean corrupted entries from remaining days
    const remainingKeys = entryKeys.filter(key => {
      const date = key.replace(ENTRIES_KEY_PREFIX, '');
      return date >= thirtyDaysAgo;
    });

    for (const key of remainingKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const entries = JSON.parse(data);
          const cleanEntries = entries.filter(e => e.steps > 0 && e.steps <= MAX_SINGLE_ENTRY_STEPS);
          if (cleanEntries.length !== entries.length) {
            // Some entries were corrupted, save cleaned version
            await AsyncStorage.setItem(key, JSON.stringify(cleanEntries));
          }
        }
      } catch (e) {
        // Skip individual key errors
      }
    }
  } catch (error) {
    console.error('[StepEntryService] cleanupOldEntries error:', error);
  }
};

export default {
  recordEntry,
  getLocalEntries,
  getLocalHourlyData,
  getLastEventTimestamp,
  syncEntriesToBackend,
  cleanupOldEntries,
};