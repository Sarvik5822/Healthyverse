/**
 * Auth Events Service
 *
 * Event-driven authentication state management.
 * Replaces the unreliable global.authExpired polling pattern
 * with an instant EventEmitter-based approach.
 *
 * Usage:
 * - Emit 'tokenExpired' from API interceptor when 401 is received
 * - Listen in UserContext to trigger logout immediately
 */

import { EventEmitter } from 'events';

// Singleton event emitter for auth-related events
const authEvents = new EventEmitter();

// Prevent memory leak warnings for multiple listeners
authEvents.setMaxListeners(10);

// Event constants
export const AUTH_EVENTS = {
  TOKEN_EXPIRED: 'tokenExpired',
  SESSION_INVALID: 'sessionInvalid',
  ACCOUNT_DEACTIVATED: 'accountDeactivated',
};

export default authEvents;