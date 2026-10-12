import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import { getToken, setToken, clearToken } from '../services/storage';
import { disconnectSocket } from '../services/socket';
import authEvents, { AUTH_EVENTS } from '../services/authEvents';
import client from '../api/client';

export const UserContext = createContext({});

// ─── Safe Storage Helper ──────────────────────────────────────────────────────
// Uses the SAME fallback pattern as storage.js to avoid "RNEncryptedStorage is undefined"
let EncryptedStorageRef = null;
let AsyncStorageRef = null;

try {
  const mod = require('react-native-encrypted-storage');
  EncryptedStorageRef = mod.default || mod;
} catch (e) {
  // Not available
}

try {
  const mod = require('@react-native-async-storage/async-storage');
  AsyncStorageRef = mod.default || mod;
} catch (e) {
  // Not available
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
      // EncryptedStorage native module not ready — fallback to AsyncStorage
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
      // EncryptedStorage failed — try AsyncStorage
      try {
        if (AsyncStorageRef) {
          await AsyncStorageRef.setItem(key, value);
        }
      } catch (e2) {
        if (__DEV__) {
          console.warn(`[UserContext.SafeStorage] Failed to set '${key}':`, e2.message);
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

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = useRef(AppState.currentState);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await client.get('/profile');
      setUserProfile(res.data.user || res.data);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      const status = error.response?.status;
      // If token is expired/invalid, force logout
      if (status === 401 || status === 403) {
        await clearAllTokens();
        setUserProfile(null);
        setIsAuthenticated(false);
      }
      return null;
    }
  }, []);

  /**
   * LOGIN - FIXED TOKEN STORAGE
   *
   * Root Cause of "login success but stays on login screen":
   * - Login API returns 200 with tokens ✅
   * - Token storage SILENTLY FAILS because RNEncryptedStorage native module isn't ready ❌
   * - Next API call (fetchProfile) has no token → 401 ❌
   * - fetchProfile catches 401 → sets isAuthenticated = false ❌
   * - AppNavigator sees isAuthenticated = false → shows AuthStack (login screen) ❌
   *
   * Fix: SafeStorage now falls back to AsyncStorage if EncryptedStorage throws.
   * Also: setIsAuthenticated(true) BEFORE fetchProfile, and only revert on actual 401.
   */
  const login = useCallback(async (email, password) => {
    // Sanitize inputs
    const sanitizedEmail = email?.trim().toLowerCase();
    if (!sanitizedEmail || !password) {
      throw new Error('Email and password are required');
    }

    const res = await client.post('/auth/login', {
      email: sanitizedEmail,
      password,
    });

    const { accessToken, refreshToken, token } = res.data;

    // The actual access token (prefer new field, fallback to legacy)
    const actualAccessToken = accessToken || token;

    if (!actualAccessToken) {
      throw new Error('No token received from server');
    }

    // Store under the key that client.js interceptor reads FIRST
    await SafeStorage.setItem('accessToken', actualAccessToken);

    // Store refresh token (for silent refresh on 401)
    if (refreshToken) {
      await SafeStorage.setItem('refreshToken', refreshToken);
    }

    // Also store under legacy key for backward compatibility
    await setToken(actualAccessToken);

    // Set authenticated IMMEDIATELY after token storage
    // This triggers AppNavigator to switch to MainStack
    setIsAuthenticated(true);

    // Fetch profile in background (don't block navigation)
    fetchProfile().catch(() => {
      // If profile fetch fails, we still have the token stored
      // The user will see the dashboard, and profile will load on next attempt
    });

    return res.data;
  }, [fetchProfile]);

  /**
   * Clear all token storage keys
   */
  const clearAllTokens = async () => {
    await SafeStorage.removeItem('accessToken');
    await SafeStorage.removeItem('refreshToken');
    await clearToken(); // Clears "auth_token" legacy key
  };

  const logout = useCallback(async () => {
    try {
      disconnectSocket();
    } catch (e) {
      // Socket cleanup is best-effort
    }
    await clearAllTokens();
    setUserProfile(null);
    setIsAuthenticated(false);
  }, []);

  const updateUserProfile = useCallback((data) => {
    setUserProfile((prev) => (prev ? { ...prev, ...data } : data));
  }, []);

  // Event-driven auth expiry handling (replaces global.authExpired polling)
  useEffect(() => {
    const handleTokenExpired = () => {
      if (isAuthenticated) {
        logout();
      }
    };

    const handleAccountDeactivated = () => {
      // Account deactivated - let the UI show the message from API response
    };

    authEvents.on(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
    authEvents.on(AUTH_EVENTS.ACCOUNT_DEACTIVATED, handleAccountDeactivated);

    return () => {
      authEvents.off(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      authEvents.off(AUTH_EVENTS.ACCOUNT_DEACTIVATED, handleAccountDeactivated);
    };
  }, [isAuthenticated, logout]);

  // Re-validate token when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        // Silently re-validate token
        const token = await getToken();
        if (!token) {
          // Also check new key before logging out
          const accessToken = await SafeStorage.getItem('accessToken');
          if (!accessToken) {
            await logout();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, logout]);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check new key first
        let storedToken = await SafeStorage.getItem('accessToken');

        // Fallback: check legacy key
        if (!storedToken) {
          storedToken = await getToken();
        }

        if (storedToken) {
          // Ensure token is stored under both keys (migration)
          const accessTokenStored = await SafeStorage.getItem('accessToken');
          if (!accessTokenStored) {
            await SafeStorage.setItem('accessToken', storedToken);
          }

          // Token exists — try to fetch profile
          const profileResult = await fetchProfile();
          if (!profileResult) {
            // Profile fetch failed (likely 401) — token is invalid
            // fetchProfile already handles cleanup
          }
        }
      } catch (e) {
        // Auth check failed - user stays logged out
        await clearAllTokens();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [fetchProfile]);

  return (
    <UserContext.Provider
      value={{
        userProfile,
        isLoading,
        isAuthenticated,
        login,
        logout,
        fetchProfile,
        updateUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};