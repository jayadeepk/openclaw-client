/** Shared layout constants (same for all themes) */
export const layout = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
  },
  fontSize: {
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
  },
} as const;

/** Dark colour palette */
export const darkColors = {
  background: '#0a0a0f',
  surface: '#14141c',
  surfaceLight: '#1e1e2a',
  primary: '#6c63ff',
  primaryDark: '#4a42d4',
  accent: '#00d4aa',
  text: '#e8e8ef',
  textSecondary: '#8888a0',
  textMuted: '#55556a',
  userBubble: '#6c63ff',
  assistantBubble: '#1e1e2a',
  error: '#ff4466',
  border: '#2a2a3a',
  inputBg: '#14141c',
} as const;

/** Light colour palette */
export const lightColors = {
  background: '#f5f5fa',
  surface: '#ffffff',
  surfaceLight: '#eeeef4',
  primary: '#6c63ff',
  primaryDark: '#4a42d4',
  accent: '#00a884',
  text: '#1a1a2e',
  textSecondary: '#6b6b80',
  textMuted: '#9999aa',
  userBubble: '#6c63ff',
  assistantBubble: '#ffffff',
  error: '#e53e3e',
  border: '#d8d8e4',
  inputBg: '#ffffff',
} as const;

export type ThemeColors = {
  [K in keyof typeof darkColors]: string;
};
export type ThemeMode = 'dark' | 'light';

export interface AppTheme {
  colors: ThemeColors;
  spacing: typeof layout.spacing;
  borderRadius: typeof layout.borderRadius;
  fontSize: typeof layout.fontSize;
  mode: ThemeMode;
}

export function buildTheme(mode: ThemeMode): AppTheme {
  return {
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing: layout.spacing,
    borderRadius: layout.borderRadius,
    fontSize: layout.fontSize,
    mode,
  };
}

/** Default dark theme — kept for backward compatibility */
export const theme = buildTheme('dark');
