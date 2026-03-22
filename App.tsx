import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './app/navigation/AppNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { theme } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
