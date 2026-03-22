import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppSettings } from '../../types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../utils/storage';
import { useTheme } from '../../contexts/ThemeContext';

export type RootStackParamList = {
  Chat: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Root navigator — manages settings state and passes it to screens */
export function AppNavigator() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    void saveSettings(newSettings);
  }, []);

  if (!loaded) return null; // Wait for settings before rendering

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode === 'dark',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Chat">
          {(props: NativeStackScreenProps<RootStackParamList, 'Chat'>) => (
            <ChatScreen navigation={props.navigation} settings={settings} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {(props: NativeStackScreenProps<RootStackParamList, 'Settings'>) => (
            <SettingsScreen
              settings={settings}
              onSave={handleSaveSettings}
              onGoBack={() => { props.navigation.goBack(); }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
