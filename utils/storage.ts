import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@openclaw/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  gatewayHost: 'localhost',
  gatewayPort: '18789',
  authToken: '',
};

/** Load persisted settings, falling back to defaults */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/** Persist settings to AsyncStorage */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }
}

/** Build the full WebSocket URL from settings */
export function buildWsUrl(settings: AppSettings): string {
  const { gatewayHost, gatewayPort } = settings;
  return `ws://${gatewayHost}:${gatewayPort}`;
}
