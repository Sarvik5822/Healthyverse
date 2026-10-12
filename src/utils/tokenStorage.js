/**
 * Token Storage Utility
 *
 * Safe wrapper around react-native-encrypted-storage for token management.
 * Handles the RNEncryptedStorage undefined error gracefully.
 *
 * Usage:
 *   import TokenStorage from '../utils/tokenStorage';
 *   const token = await TokenStorage.getAccessToken();
 *   await TokenStorage.setTokens(accessToken, refreshToken);
 *   await TokenStorage.clearAll();
 */

import EncryptedStorage from 'react-native-encrypted-storage';

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
};

/**
 * Safe wrapper that catches native module errors
 */
const safeGet = async (key) => {
  try {
    return await EncryptedStorage.getItem(key);
  } catch (error) {
    if (__DEV__) {
      console.warn(`[TokenStorage] getItem('${key}') failed:`, error.message);
    }
    return null;
  }
};

const safeSet = async (key, value) => {
  try {
    await EncryptedStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn(`[TokenStorage] setItem('${key}') failed:`, error.message);
    }
    return false;
  }
};

const safeRemove = async (key) => {
  try {
    await EncryptedStorage.removeItem(key);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn(`[TokenStorage] removeItem('${key}') failed:`, error.message);
    }
    return false;
  }
};

const TokenStorage = {
  // ─── Access Token ───────────────────────────────────────────────────────────
  getAccessToken: () => safeGet(KEYS.ACCESS_TOKEN),
  setAccessToken: (token) => safeSet(KEYS.ACCESS_TOKEN, token),

  // ─── Refresh Token ──────────────────────────────────────────────────────────
  getRefreshToken: () => safeGet(KEYS.REFRESH_TOKEN),
  setRefreshToken: (token) => safeSet(KEYS.REFRESH_TOKEN, token),

  // ─── Dual Token Management ──────────────────────────────────────────────────
  setTokens: async (accessToken, refreshToken) => {
    await safeSet(KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      await safeSet(KEYS.REFRESH_TOKEN, refreshToken);
    }
  },

  // ─── User Data ──────────────────────────────────────────────────────────────
  getUserData: async () => {
    const data = await safeGet(KEYS.USER_DATA);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  },
  setUserData: async (userData) => {
    await safeSet(KEYS.USER_DATA, JSON.stringify(userData));
  },

  // ─── Clear All ──────────────────────────────────────────────────────────────
  clearAll: async () => {
    await safeRemove(KEYS.ACCESS_TOKEN);
    await safeRemove(KEYS.REFRESH_TOKEN);
    await safeRemove(KEYS.USER_DATA);
  },

  // ─── Check if tokens exist ──────────────────────────────────────────────────
  hasTokens: async () => {
    const accessToken = await safeGet(KEYS.ACCESS_TOKEN);
    return !!accessToken;
  },
};

export default TokenStorage;
export { KEYS };