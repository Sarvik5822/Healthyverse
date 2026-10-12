/**
 * App Configuration
 * Environment-based API URLs.
 *
 * For production: Update these URLs to your production server.
 * For development: Uses Dev Tunnel URL as default.
 *
 * RECOMMENDED: Install react-native-config for .env support:
 *   1. npm install react-native-config
 *   2. Create .env file with API_BASE_URL and SOCKET_URL
 *   3. Uncomment the Config import below
 */

// import Config from 'react-native-config';

// Detect environment safely - defaults to production (safer)
const isDev = (() => {
  try {
    if (typeof __DEV__ !== 'undefined') return __DEV__;
    if (typeof global !== 'undefined' && typeof global.__DEV__ !== 'undefined') return global.__DEV__;
    return false; // Default to production if unsure (safer)
  } catch (e) {
    return false;
  }
})();

// Production URLs (HTTPS enforced)
const PRODUCTION_API_URL = 'https://healthyverse-api.fuelitonline.com/api';
const PRODUCTION_SOCKET_URL = 'https://healthyverse-api.fuelitonline.com';

// Development URLs (Dev Tunnel)
const DEV_API_URL = 'https://k12n9f93-5000.inc1.devtunnels.ms/api';
const DEV_SOCKET_URL = 'https://k12n9f93-5000.inc1.devtunnels.ms';

const API_BASE_URL = isDev ? DEV_API_URL : PRODUCTION_API_URL;
const SOCKET_URL = isDev ? DEV_SOCKET_URL : PRODUCTION_SOCKET_URL;

// App constants
const APP_VERSION = '1.0.0';
const TOKEN_EXPIRY_DAYS = 7;

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

export { API_BASE_URL, SOCKET_URL, APP_VERSION, TOKEN_EXPIRY_DAYS, REQUEST_TIMEOUT };