/**
 * AsyncStorage Keys
 * Single source of truth for all AsyncStorage key strings.
 * Prevents typos and makes it easy to find all storage usage.
 */

// Authentication
export const AUTH_TOKEN_KEY = '@auth_token';
export const USER_PROFILE_KEY = '@user_profile';

// Step Tracking
export const STEPS_BASELINE_KEY = '@steps_baseline';
export const STEPS_BASELINE_DATE_KEY = '@steps_baseline_date';
export const STEPS_YESTERDAY_KEY = '@steps_yesterday';
export const STEPS_BACKEND_OFFSET_KEY = '@steps_backend_offset';
export const STEPS_BACKEND_OFFSET_DATE_KEY = '@steps_backend_offset_date';

// Preferences
export const THEME_KEY = '@theme_preference';
export const UNIT_PREFERENCES_KEY = '@unit_preferences';
export const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

// Cache
export const HEALTH_DATA_CACHE_KEY = '@health_data_cache';
export const LAST_SYNC_KEY = '@last_sync_timestamp';