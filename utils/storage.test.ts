import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { loadSettings, saveSettings, buildWsUrl, DEFAULT_SETTINGS, loadMessages, saveMessages, clearPersistedMessages, loadConversations, saveConversations, loadActiveConversationId, saveActiveConversationId, loadConversationMessages, saveConversationMessages, deleteConversationMessages, loadThemeMode, saveThemeMode, loadFontSize, saveFontSize } from './storage';
import { ChatMessage, Conversation } from '../types';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockSecureGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSecureSetItem = SecureStore.setItemAsync as jest.Mock;
const mockSecureDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('loadSettings', () => {
  it('returns defaults when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSecureGetItem.mockResolvedValue(null);
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values with defaults and loads token from SecureStore', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ gatewayHost: '10.0.0.1' }));
    mockSecureGetItem.mockResolvedValue('secret-tok');
    const result = await loadSettings();
    expect(result).toEqual({
      gatewayHost: '10.0.0.1',
      gatewayPort: '18789',
      authToken: 'secret-tok',
    });
  });

  it('returns empty authToken when SecureStore has no token', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ gatewayHost: '10.0.0.1' }));
    mockSecureGetItem.mockResolvedValue(null);
    const result = await loadSettings();
    expect(result.authToken).toBe('');
  });

  it('returns defaults on AsyncStorage error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('returns defaults on corrupt JSON', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockResolvedValue('not valid json{');
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(SyntaxError));
    warnSpy.mockRestore();
  });
});

describe('saveSettings', () => {
  it('persists settings to AsyncStorage and token to SecureStore', async () => {
    const settings = { gatewayHost: '10.0.0.1', gatewayPort: '9999', authToken: 'tok' };
    await saveSettings(settings);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@openclaw/settings',
      JSON.stringify({ gatewayHost: '10.0.0.1', gatewayPort: '9999' }),
    );
    expect(mockSecureSetItem).toHaveBeenCalledWith('openclaw_auth_token', 'tok');
  });

  it('deletes token from SecureStore when authToken is empty', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, authToken: '' });
    expect(mockSecureDeleteItem).toHaveBeenCalledWith('openclaw_auth_token');
    expect(mockSecureSetItem).not.toHaveBeenCalled();
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

const makeMsg = (id: string, role: 'user' | 'assistant' = 'user'): ChatMessage => ({
  id,
  role,
  content: `msg-${id}`,
  timestamp: Date.now(),
});

describe('loadMessages', () => {
  it('returns empty array when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadMessages()).toEqual([]);
  });

  it('returns stored messages', async () => {
    const msgs = [makeMsg('1'), makeMsg('2', 'assistant')];
    mockGetItem.mockResolvedValue(JSON.stringify(msgs));
    expect(await loadMessages()).toEqual(msgs);
  });

  it('returns empty array on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadMessages()).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('saveMessages', () => {
  it('persists messages to the correct key', async () => {
    const msgs = [makeMsg('1'), makeMsg('2')];
    await saveMessages(msgs);
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/messages', JSON.stringify(msgs));
  });

  it('filters out streaming messages', async () => {
    const msgs: ChatMessage[] = [
      makeMsg('1'),
      { ...makeMsg('2', 'assistant'), streaming: true },
      makeMsg('3'),
    ];
    await saveMessages(msgs);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string) as ChatMessage[];
    expect(saved).toHaveLength(2);
    expect(saved.map((m) => m.id)).toEqual(['1', '3']);
  });

  it('keeps only the most recent 100 messages', async () => {
    const msgs = Array.from({ length: 120 }, (_, i) => makeMsg(String(i)));
    await saveMessages(msgs);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string) as ChatMessage[];
    expect(saved).toHaveLength(100);
    expect(saved[0].id).toBe('20');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveMessages([makeMsg('1')])).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('clearPersistedMessages', () => {
  it('removes the messages key', async () => {
    await clearPersistedMessages();
    expect(mockRemoveItem).toHaveBeenCalledWith('@openclaw/messages');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockRemoveItem.mockRejectedValue(new Error('remove error'));
    await expect(clearPersistedMessages()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to clear messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('buildWsUrl', () => {
  it('builds correct URL from settings', () => {
    expect(buildWsUrl({ gatewayHost: '10.0.0.1', gatewayPort: '9999', authToken: '' }))
      .toBe('ws://10.0.0.1:9999');
  });

  it('handles localhost defaults', () => {
    expect(buildWsUrl(DEFAULT_SETTINGS)).toBe('ws://localhost:18789');
  });
});

// ─── Conversation Storage ────────────────────────────────────────────────────

const makeConv = (id: string): Conversation => ({
  id,
  title: `Chat ${id}`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('loadConversations', () => {
  it('returns empty array when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadConversations()).toEqual([]);
  });

  it('returns stored conversations', async () => {
    const convs = [makeConv('c1'), makeConv('c2')];
    mockGetItem.mockResolvedValue(JSON.stringify(convs));
    expect(await loadConversations()).toEqual(convs);
  });

  it('returns empty array on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadConversations()).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe('saveConversations', () => {
  it('persists conversations', async () => {
    const convs = [makeConv('c1')];
    await saveConversations(convs);
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/conversations', JSON.stringify(convs));
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveConversations([makeConv('c1')])).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save conversations:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('loadActiveConversationId', () => {
  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadActiveConversationId()).toBeNull();
  });

  it('returns stored id', async () => {
    mockGetItem.mockResolvedValue('c1');
    expect(await loadActiveConversationId()).toBe('c1');
  });

  it('returns null on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadActiveConversationId()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Failed to load active conversation ID:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('saveActiveConversationId', () => {
  it('persists the active conversation id', async () => {
    await saveActiveConversationId('c1');
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/activeConversation', 'c1');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveActiveConversationId('c1')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save active conversation ID:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('loadConversationMessages', () => {
  it('returns empty array when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadConversationMessages('c1')).toEqual([]);
  });

  it('returns stored messages for the conversation', async () => {
    const msgs = [makeMsg('1')];
    mockGetItem.mockResolvedValue(JSON.stringify(msgs));
    const result = await loadConversationMessages('c1');
    expect(result).toEqual(msgs);
    expect(mockGetItem).toHaveBeenCalledWith('@openclaw/conv_messages/c1');
  });

  it('returns empty array on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadConversationMessages('c1')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load conversation messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('saveConversationMessages', () => {
  it('persists messages to the conversation key', async () => {
    const msgs = [makeMsg('1')];
    await saveConversationMessages('c1', msgs);
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/conv_messages/c1', JSON.stringify(msgs));
  });

  it('filters out streaming messages', async () => {
    const msgs: ChatMessage[] = [
      makeMsg('1'),
      { ...makeMsg('2', 'assistant'), streaming: true },
    ];
    await saveConversationMessages('c1', msgs);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string) as ChatMessage[];
    expect(saved).toHaveLength(1);
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveConversationMessages('c1', [makeMsg('1')])).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save conversation messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('deleteConversationMessages', () => {
  it('removes the conversation messages key', async () => {
    await deleteConversationMessages('c1');
    expect(mockRemoveItem).toHaveBeenCalledWith('@openclaw/conv_messages/c1');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockRemoveItem.mockRejectedValue(new Error('remove error'));
    await expect(deleteConversationMessages('c1')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to delete conversation messages:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

// ─── Theme Mode Storage ──────────────────────────────────────────────────────

describe('loadThemeMode', () => {
  it('returns dark when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadThemeMode()).toBe('dark');
  });

  it('returns light when stored', async () => {
    mockGetItem.mockResolvedValue('light');
    expect(await loadThemeMode()).toBe('light');
  });

  it('returns dark on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadThemeMode()).toBe('dark');
    expect(warnSpy).toHaveBeenCalledWith('Failed to load theme mode:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('returns dark on invalid value', async () => {
    mockGetItem.mockResolvedValue('blue');
    expect(await loadThemeMode()).toBe('dark');
  });
});

describe('saveThemeMode', () => {
  it('persists to the correct key', async () => {
    await saveThemeMode('light');
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/themeMode', 'light');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveThemeMode('dark')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save theme mode:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

// ─── Font Size Storage ───────────────────────────────────────────────────────

describe('loadFontSize', () => {
  it('returns medium as default', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await loadFontSize()).toBe('medium');
  });

  it.each(['small', 'medium', 'large', 'extra-large'] as const)(
    'returns stored value %s',
    async (label) => {
      mockGetItem.mockResolvedValue(label);
      expect(await loadFontSize()).toBe(label);
    },
  );

  it('returns medium on error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockGetItem.mockRejectedValue(new Error('read error'));
    expect(await loadFontSize()).toBe('medium');
    expect(warnSpy).toHaveBeenCalledWith('Failed to load font size:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('returns medium on invalid value', async () => {
    mockGetItem.mockResolvedValue('huge');
    expect(await loadFontSize()).toBe('medium');
  });
});

describe('saveFontSize', () => {
  it('persists to the correct key', async () => {
    await saveFontSize('large');
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/fontSize', 'large');
  });

  it('swallows errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveFontSize('medium')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('Failed to save font size:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('web platform token storage', () => {
  let mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    Platform.OS = 'web';
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: jest.fn((key: string, val: string) => { mockLocalStorage[key] = val; }),
        removeItem: jest.fn((key: string) => { mockLocalStorage = Object.fromEntries(Object.entries(mockLocalStorage).filter(([k]) => k !== key)); }),
      },
      writable: true,
    });
  });

  it('loads token from localStorage on web', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ gatewayHost: '10.0.0.1' }));
    mockLocalStorage['openclaw_auth_token'] = 'web-token';
    const result = await loadSettings();
    expect(result.authToken).toBe('web-token');
    expect(mockSecureGetItem).not.toHaveBeenCalled();
  });

  it('saves token to localStorage on web', async () => {
    await saveSettings({ gatewayHost: '10.0.0.1', gatewayPort: '9999', authToken: 'web-tok' });
    expect(mockLocalStorage['openclaw_auth_token']).toBe('web-tok');
    expect(mockSecureSetItem).not.toHaveBeenCalled();
  });

  it('removes token from localStorage when empty on web', async () => {
    mockLocalStorage['openclaw_auth_token'] = 'old-token';
    await saveSettings({ ...DEFAULT_SETTINGS, authToken: '' });
    expect(mockLocalStorage['openclaw_auth_token']).toBeUndefined();
    expect(mockSecureDeleteItem).not.toHaveBeenCalled();
  });
});
