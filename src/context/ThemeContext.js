import React, { createContext, useState, useEffect, useCallback } from 'react';
import { lightColors, darkColors } from '../theme/colors';

export const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const saved = await AsyncStorage.getItem('theme');
        if (saved !== null) {
          setIsDark(saved === 'dark');
        }
      } catch (e) {
        console.log('Theme load error', e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = useCallback(async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const newDark = !isDark;
      setIsDark(newDark);
      await AsyncStorage.setItem('theme', newDark ? 'dark' : 'light');
    } catch (e) {
      console.log('Theme save error', e);
    }
  }, [isDark]);

  const colors = isDark ? darkColors : lightColors;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};