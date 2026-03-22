import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AppSettings, ChatMessage } from '../types';
import { ThemeMode } from '../constants/theme';

const SETTINGS_KEY = '@openclaw/settings';
const MESSAGES_KEY = '@openclaw/messages';
const THEME_MODE_KEY = '@openclaw/themeMode';
const AUTH_TOKEN_KEY = 'openclaw_auth_token';
const MAX_PERSISTED_MESSAGES = 100;

// SecureStore is not available on web — fall back to localStorage
const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(AUTH_TOKEN_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, value);
  },
  async remove(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  gatewayHost: 'localhost',
  gatewayPort: '18789',
  authToken: '',
};

/** Load persisted settings, falling back to defaults.
 *  Auth token is stored in SecureStore (Keychain/Keystore). */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const [raw, authToken] = await Promise.all([
      AsyncStorage.getItem(SETTINGS_KEY),
      tokenStore.get(),
    ]);
    const base = raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
      : { ...DEFAULT_SETTINGS };
    return { ...base, authToken: authToken ?? '' };
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

/** Persist settings. Auth token goes to SecureStore; the rest to AsyncStorage. */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const { authToken, ...rest } = settings;
    await Promise.all([
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(rest)),
      authToken
        ? tokenStore.set(authToken)
        : tokenStore.remove(),
    ]);
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }
}

/** Load persisted chat messages */
export async function loadMessages(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(MESSAGES_KEY);
    if (raw) {
      return JSON.parse(raw) as ChatMessage[];
    }
  } catch (err) {
    console.warn('Failed to load messages:', err);
  }
  return [];
}

/** Persist chat messages (keeps the most recent ones) */
export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  try {
    // Only persist non-streaming messages
    const toSave = messages
      .filter((m) => !m.streaming)
      .slice(-MAX_PERSISTED_MESSAGES);
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Failed to save messages:', err);
  }
}

/** Clear persisted chat messages */
export async function clearPersistedMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MESSAGES_KEY);
  } catch (err) {
    console.warn('Failed to clear messages:', err);
  }
}

/** Load persisted theme mode */
export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(THEME_MODE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch (err) {
    console.warn('Failed to load theme mode:', err);
  }
  return 'dark';
}

/** Persist theme mode */
export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  } catch (err) {
    console.warn('Failed to save theme mode:', err);
  }
}

/** Build the full WebSocket URL from settings */
export function buildWsUrl(settings: AppSettings): string {
  const { gatewayHost, gatewayPort } = settings;
  return `ws://${gatewayHost}:${gatewayPort}`;
}
