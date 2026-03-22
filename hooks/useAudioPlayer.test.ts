import { Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File } from 'expo-file-system';
import { useAudioPlayer } from './useAudioPlayer';

const mockCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockSetAudioMode = setAudioModeAsync as jest.Mock;
const MockFile = File as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  mockCreateAudioPlayer.mockReturnValue({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
  });
});

describe('useAudioPlayer', () => {
  it('configures audio mode on playAudio', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('base64data', 'audio/mp3');
    });
    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
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

  it('creates player and plays', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('base64data', 'audio/mp3');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ uri: expect.any(String) }),
    );
    const player = mockCreateAudioPlayer.mock.results[0].value;
    expect(player.play).toHaveBeenCalled();
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

  it('removes previous player before playing new one', async () => {
    const firstPlayer = { play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
    const secondPlayer = { play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
    mockCreateAudioPlayer
      .mockReturnValueOnce(firstPlayer)
      .mockReturnValueOnce(secondPlayer);

    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    expect(firstPlayer.remove).toHaveBeenCalled();
  });

  it('stopAudio removes player', async () => {
    const mockPlayer = { play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
    mockCreateAudioPlayer.mockReturnValue(mockPlayer);

    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    await act(async () => {
      result.current.stopAudio();
    });
    expect(mockPlayer.remove).toHaveBeenCalled();
  });

  it('stopAudio is safe when nothing is playing', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      result.current.stopAudio();
    });
    // Should not throw
  });

  it('isPlaying is true after playAudio', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    expect(result.current.isPlaying).toBe(false);
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    expect(result.current.isPlaying).toBe(true);
  });

  it('isPlaying is false after stopAudio', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    expect(result.current.isPlaying).toBe(true);
    await act(async () => {
      result.current.stopAudio();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('handles playAudio error gracefully', async () => {
    mockSetAudioMode.mockRejectedValueOnce(new Error('audio mode error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });

    expect(warnSpy).toHaveBeenCalledWith('Audio playback failed:', expect.any(Error));
    warnSpy.mockRestore();
  });

  describe('web platform', () => {
    let mockPlay: jest.Mock;
    let mockPause: jest.Mock;

    beforeEach(() => {
      Platform.OS = 'web';
      mockPlay = jest.fn().mockResolvedValue(undefined);
      mockPause = jest.fn();
      (window as unknown as Record<string, unknown>).Audio = jest.fn().mockImplementation(() => ({
        play: mockPlay,
        pause: mockPause,
        onended: null,
      }));
    });

    afterEach(() => {
      (window as unknown as Record<string, unknown>).Audio = undefined;
    });

    it('plays audio via HTMLAudioElement with data URI on web', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('base64data', 'audio/mp3');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/mpeg;base64,base64data');
      expect(mockPlay).toHaveBeenCalled();
    });

    it('normalizes gateway format strings to MIME types', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio-24khz-48kbitrate-mono-mp3');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/mpeg;base64,data');
    });

    it('pauses previous web audio before playing new one', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });
      expect(mockPause).toHaveBeenCalled();
    });

    it('stopAudio pauses web audio', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/mp3');
      });
      await act(async () => {
        result.current.stopAudio();
      });
      expect(mockPause).toHaveBeenCalled();
    });

    it('does not use expo-audio on web', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/mp3');
      });
      expect(mockSetAudioMode).not.toHaveBeenCalled();
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    });
  });
});
