import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppTheme, ThemeMode, buildTheme } from '../constants/theme';
import { loadThemeMode, saveThemeMode } from '../utils/storage';

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode ?? 'dark');
  const [loaded, setLoaded] = useState(!!initialMode);

  useEffect(() => {
    if (initialMode) return;
    void loadThemeMode().then((m) => {
      setMode(m);
      setLoaded(true);
    });
  }, [initialMode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      void saveThemeMode(next);
      return next;
    });
  }, []);

  const themeObj = useMemo(() => buildTheme(mode), [mode]);
  const value = useMemo(() => ({ theme: themeObj, toggleTheme }), [themeObj, toggleTheme]);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
