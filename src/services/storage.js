/**
 * Secure Storage Service
 * 
 * Uses react-native-encrypted-storage for sensitive data (tokens)
 * and AsyncStorage for non-sensitive data.
 * 
 * If react-native-encrypted-storage is not available, falls back to AsyncStorage
 * with a warning. Install it for production:
 *   npm install react-native-encrypted-storage
 */

import AsyncStorageModule from '@react-native-async-storage/async-storage';

let EncryptedStorage = null;
const AsyncStorage = AsyncStorageModule;

try {
  const EncryptedStorageModule = require('react-native-encrypted-storage');
  EncryptedStorage = EncryptedStorageModule.default || EncryptedStorageModule;
} catch (e) {
  // Fallback to AsyncStorage if encrypted storage is not installed
  console.warn(
    '[Security Warning] react-native-encrypted-storage not found. ' +
    'Falling back to AsyncStorage. Install it for production: ' +
    'npm install react-native-encrypted-storage'
  );
}

const TOKEN_KEY = 'auth_token';

// Use encrypted storage for tokens if available, otherwise fallback
const secureGet = async (key) => {
  try {
    if (EncryptedStorage) {
      return await EncryptedStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Storage get error:', error.message);
    return null;
  }
};

const secureSet = async (key, value) => {
  try {
    if (EncryptedStorage) {
      await EncryptedStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Storage set error:', error.message);
  }
};

const secureRemove = async (key) => {
  try {
    if (EncryptedStorage) {
      await EncryptedStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Storage remove error:', error.message);
  }
};

const getToken = async () => {
  return await secureGet(TOKEN_KEY);
};

const setToken = async (token) => {
  if (!token || typeof token !== 'string') {
    console.error('Invalid token provided to setToken');
    return;
  }
  await secureSet(TOKEN_KEY, token);
};

const clearToken = async () => {
  await secureRemove(TOKEN_KEY);
};

const clearAll = async () => {
  try {
    if (EncryptedStorage) {
      await EncryptedStorage.clear();
    }
    if (AsyncStorage) {
      await AsyncStorage.clear();
    }
  } catch (error) {
    console.error('Clear all storage error:', error.message);
  }
};

export {
  getToken,
  setToken,
  clearToken,
  clearAll,
};