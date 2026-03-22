import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, saveSettings, buildWsUrl, DEFAULT_SETTINGS, loadMessages, saveMessages, clearPersistedMessages } from './storage';
import { ChatMessage } from '../types';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadSettings', () => {
  it('returns defaults when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values with defaults', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ gatewayHost: '10.0.0.1' }));
    const result = await loadSettings();
    expect(result).toEqual({
      gatewayHost: '10.0.0.1',
      gatewayPort: '18789',
      authToken: '',
    });
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
  it('persists JSON to the correct key', async () => {
    const settings = { gatewayHost: '10.0.0.1', gatewayPort: '9999', authToken: 'tok' };
    await saveSettings(settings);
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/settings', JSON.stringify(settings));
  });

  it('swallows AsyncStorage errors', async () => {
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
