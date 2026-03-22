import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, ChatMessage } from '../types';

const SETTINGS_KEY = '@openclaw/settings';
const MESSAGES_KEY = '@openclaw/messages';
const MAX_PERSISTED_MESSAGES = 100;

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

/** Build the full WebSocket URL from settings */
export function buildWsUrl(settings: AppSettings): string {
  const { gatewayHost, gatewayPort } = settings;
  return `ws://${gatewayHost}:${gatewayPort}`;
}
