import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tekkipro.theme';
export const THEME_OPTIONS = [
  { code: 'dark', icon: 'moon' },
  { code: 'light', icon: 'sun' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedTheme) => {
        if (mounted && THEME_OPTIONS.some((item) => item.code === storedTheme)) {
          setThemeState(storedTheme);
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  const setTheme = useCallback(async (nextTheme) => {
    if (!THEME_OPTIONS.some((item) => item.code === nextTheme)) return;

    setThemeState(nextTheme);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [setTheme, theme]);

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    themes: THEME_OPTIONS,
    setTheme,
    toggleTheme,
  }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}