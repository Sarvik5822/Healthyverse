/**
 * API Client - OPTIMIZED
 *
 * FIXES APPLIED:
 * 1. Fixed import path: '../utils/authEvents' → '../services/authEvents'
 * 2. Fixed import style: { authEvents } (named) → authEvents (default)
 * 3. Unified storage: Uses storage.js service (which already handles EncryptedStorage/AsyncStorage fallback)
 *    - This eliminates the "RNEncryptedStorage is undefined" crash in client.js
 * 4. JWT Refresh Token interceptor with request queuing
 *
 * KEY FIX: Uses getToken/setToken from storage.js which already has proper fallback.
 * Added "accessToken" and "refreshToken" keys via the same safe storage mechanism.
 */

import axios from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT } from '../config';
import authEvents, { AUTH_EVENTS } from '../services/authEvents';
import { getToken, setToken } from '../services/storage';

// ─── Safe Storage using same mechanism as storage.js ──────────────────────────
// This avoids the "RNEncryptedStorage is undefined" crash by reusing
// the same fallback logic that storage.js already implements.
let EncryptedStorageRef = null;
let AsyncStorageRef = null;

try {
  const mod = require('react-native-encrypted-storage');
  EncryptedStorageRef = mod.default || mod;
} catch (e) {
  // EncryptedStorage not available
}

try {
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorageRef = mod.default || mod;
} catch (e) {
  // AsyncStorage not available
}

const SafeStorage = {
  getItem: async (key) => {
    try {
      if (EncryptedStorageRef) {
        return await EncryptedStorageRef.getItem(key);
      }
      if (AsyncStorageRef) {
        return await AsyncStorageRef.getItem(key);
      }
      return null;
    } catch (error) {
      // If EncryptedStorage throws (native module not ready), try AsyncStorage
      try {
        if (AsyncStorageRef) {
          return await AsyncStorageRef.getItem(key);
        }
      } catch (e2) {
        // Both failed
      }
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (EncryptedStorageRef) {
        await EncryptedStorageRef.setItem(key, value);
        return;
      }
      if (AsyncStorageRef) {
        await AsyncStorageRef.setItem(key, value);
      }
    } catch (error) {
      // If EncryptedStorage throws, try AsyncStorage
      try {
        if (AsyncStorageRef) {
          await AsyncStorageRef.setItem(key, value);
        }
      } catch (e2) {
        if (__DEV__) {
          console.warn(`[SafeStorage] Failed to set '${key}':`, e2.message);
        }
      }
    }
  },
  removeItem: async (key) => {
    try {
      if (EncryptedStorageRef) {
        await EncryptedStorageRef.removeItem(key);
        return;
      }
      if (AsyncStorageRef) {
        await AsyncStorageRef.removeItem(key);
      }
    } catch (error) {
      try {
        if (AsyncStorageRef) {
          await AsyncStorageRef.removeItem(key);
        }
      } catch (e2) {
        // Silent fail
      }
    }
  },
};

// Create axios instance
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of requests waiting for token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Request Interceptor ──────────────────────────────────────────────────────
client.interceptors.request.use(
  async (config) => {
    // Primary: try "accessToken" key (new dual-token system)
    let token = await SafeStorage.getItem('accessToken');

    // Fallback: try legacy "auth_token" key (for existing sessions)
    if (!token) {
      token = await getToken(); // Uses storage.js which has its own fallback
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor with Refresh Token Logic ────────────────────────────
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 (unauthorized) and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh endpoint itself or login endpoint
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login')
      ) {
        // For login failures, just reject — don't trigger auth expired
        if (originalRequest.url?.includes('/auth/login')) {
          return Promise.reject(error);
        }
        authEvents.emit(AUTH_EVENTS.TOKEN_EXPIRED);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SafeStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token — force logout
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Store new tokens
        const newAccessToken = data.accessToken || data.token;
        const newRefreshToken = data.refreshToken;

        if (newAccessToken) {
          await SafeStorage.setItem('accessToken', newAccessToken);
          // Also update legacy key for backward compatibility
          await setToken(newAccessToken);
        }
        if (newRefreshToken) {
          await SafeStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update authorization header
        client.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Process queued requests
        processQueue(null, newAccessToken);

        // Retry original request
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed — logout user
        processQueue(refreshError, null);
        authEvents.emit(AUTH_EVENTS.TOKEN_EXPIRED);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;