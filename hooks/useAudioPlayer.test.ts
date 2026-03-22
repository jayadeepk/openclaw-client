import { renderHook, act } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import { File } from 'expo-file-system';
import { useAudioPlayer } from './useAudioPlayer';

const mockCreateAsync = Audio.Sound.createAsync as jest.Mock;
const mockSetAudioMode = Audio.setAudioModeAsync as jest.Mock;
const MockFile = File as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  const mockSound = {
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(),
  };
  mockCreateAsync.mockResolvedValue({ sound: mockSound });
});

describe('useAudioPlayer', () => {
  it('configures audio mode on playAudio', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('base64data', 'audio/mp3');
    });
    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      }),
    );
  });

  it('writes base64 to temp file', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('base64data', 'audio/mp3');
    });
    const fileInstance = MockFile.mock.results[0].value;
    expect(fileInstance.write).toHaveBeenCalledWith('base64data', { encoding: 'base64' });
  });

  it('creates and plays sound', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('base64data', 'audio/mp3');
    });
    expect(mockCreateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ uri: expect.any(String) }),
      { shouldPlay: true },
    );
  });

  it('uses .wav extension for audio/wav', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/wav');
    });
    const constructorCall = MockFile.mock.calls[0];
    expect(constructorCall[1]).toMatch(/\.wav$/);
  });

  it('uses .ogg extension for audio/ogg', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/ogg');
    });
    const constructorCall = MockFile.mock.calls[0];
    expect(constructorCall[1]).toMatch(/\.ogg$/);
  });

  it('defaults to .mp3 extension', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    const constructorCall = MockFile.mock.calls[0];
    expect(constructorCall[1]).toMatch(/\.mp3$/);
  });

  it('unloads previous sound before playing new one', async () => {
    const firstSound = {
      unloadAsync: jest.fn().mockResolvedValue(undefined),
      stopAsync: jest.fn().mockResolvedValue(undefined),
      setOnPlaybackStatusUpdate: jest.fn(),
    };
    const secondSound = {
      unloadAsync: jest.fn().mockResolvedValue(undefined),
      stopAsync: jest.fn().mockResolvedValue(undefined),
      setOnPlaybackStatusUpdate: jest.fn(),
    };
    mockCreateAsync
      .mockResolvedValueOnce({ sound: firstSound })
      .mockResolvedValueOnce({ sound: secondSound });

    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    expect(firstSound.unloadAsync).toHaveBeenCalled();
  });

  it('stopAudio stops and unloads', async () => {
    const mockSound = {
      unloadAsync: jest.fn().mockResolvedValue(undefined),
      stopAsync: jest.fn().mockResolvedValue(undefined),
      setOnPlaybackStatusUpdate: jest.fn(),
    };
    mockCreateAsync.mockResolvedValue({ sound: mockSound });

    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    await act(async () => {
      await result.current.stopAudio();
    });
    expect(mockSound.stopAsync).toHaveBeenCalled();
    expect(mockSound.unloadAsync).toHaveBeenCalled();
  });

  it('stopAudio is safe when nothing is playing', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.stopAudio();
    });
    // Should not throw
  });
});
