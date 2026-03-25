import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppTheme, FontSizeLabel, ThemeMode, buildTheme } from '../constants/theme';
import { loadThemeMode, saveThemeMode, loadFontSize, saveFontSize } from '../utils/storage';

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
  setFontSize: (label: FontSizeLabel) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  initialFontSize?: FontSizeLabel;
}

export function ThemeProvider({ children, initialMode, initialFontSize }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode ?? 'dark');
  const [fontSizeLabel, setFontSizeLabel] = useState<FontSizeLabel>(initialFontSize ?? 'medium');
  const [loaded, setLoaded] = useState(!!initialMode);

  useEffect(() => {
    if (initialMode) return;
    void Promise.all([loadThemeMode(), loadFontSize()]).then(([m, f]) => {
      setMode(m);
      setFontSizeLabel(f);
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

  const setFontSize = useCallback((label: FontSizeLabel) => {
    setFontSizeLabel(label);
    void saveFontSize(label);
  }, []);

  const themeObj = useMemo(() => buildTheme(mode, fontSizeLabel), [mode, fontSizeLabel]);
  const value = useMemo(() => ({ theme: themeObj, toggleTheme, setFontSize }), [themeObj, toggleTheme, setFontSize]);

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
