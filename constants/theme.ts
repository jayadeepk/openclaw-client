/** Dark theme colours and layout constants */
export const theme = {
  colors: {
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
  },
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
