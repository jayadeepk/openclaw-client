import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AppSettings, ChatMessage, Conversation } from '../types';
import { ThemeMode } from '../constants/theme';

const SETTINGS_KEY = '@openclaw/settings';
const MESSAGES_KEY = '@openclaw/messages';
const THEME_MODE_KEY = '@openclaw/themeMode';
const CONVERSATIONS_KEY = '@openclaw/conversations';
const ACTIVE_CONVERSATION_KEY = '@openclaw/activeConversation';
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

// ─── Conversation Management ─────────────────────────────────────────────────

/** Build a per-conversation messages key */
function conversationMessagesKey(conversationId: string): string {
  return `@openclaw/conv_messages/${conversationId}`;
}

/** Load the conversation list */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (raw) return JSON.parse(raw) as Conversation[];
  } catch (err) {
    console.warn('Failed to load conversations:', err);
  }
  return [];
}

/** Save the conversation list */
export async function saveConversations(conversations: Conversation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.warn('Failed to save conversations:', err);
  }
}

/** Load the active conversation ID */
export async function loadActiveConversationId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch (err) {
    console.warn('Failed to load active conversation ID:', err);
  }
  return null;
}

/** Save the active conversation ID */
export async function saveActiveConversationId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  } catch (err) {
    console.warn('Failed to save active conversation ID:', err);
  }
}

/** Load messages for a specific conversation */
export async function loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(conversationMessagesKey(conversationId));
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch (err) {
    console.warn('Failed to load conversation messages:', err);
  }
  return [];
}

/** Save messages for a specific conversation */
export async function saveConversationMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const toSave = messages
      .filter((m) => !m.streaming)
      .slice(-MAX_PERSISTED_MESSAGES);
    await AsyncStorage.setItem(conversationMessagesKey(conversationId), JSON.stringify(toSave));
  } catch (err) {
    console.warn('Failed to save conversation messages:', err);
  }
}

/** Delete a conversation's messages from storage */
export async function deleteConversationMessages(conversationId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(conversationMessagesKey(conversationId));
  } catch (err) {
    console.warn('Failed to delete conversation messages:', err);
  }
}

/** Build the full WebSocket URL from settings */
export function buildWsUrl(settings: AppSettings): string {
  const { gatewayHost, gatewayPort } = settings;
  return `ws://${gatewayHost}:${gatewayPort}`;
}
