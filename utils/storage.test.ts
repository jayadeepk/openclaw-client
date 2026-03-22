import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, saveSettings, buildWsUrl, DEFAULT_SETTINGS } from './storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

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
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults on corrupt JSON', async () => {
    mockGetItem.mockResolvedValue('not valid json{');
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings', () => {
  it('persists JSON to the correct key', async () => {
    const settings = { gatewayHost: '10.0.0.1', gatewayPort: '9999', authToken: 'tok' };
    await saveSettings(settings);
    expect(mockSetItem).toHaveBeenCalledWith('@openclaw/settings', JSON.stringify(settings));
  });

  it('swallows AsyncStorage errors', async () => {
    mockSetItem.mockRejectedValue(new Error('write error'));
    await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
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
