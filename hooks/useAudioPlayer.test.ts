import { Platform } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from './useAudioPlayer';

const mockCreateAudioPlayer = createAudioPlayer as jest.Mock;
const mockSetAudioMode = setAudioModeAsync as jest.Mock;
const MockFile = File as unknown as jest.Mock;
const mockSpeechStop = Speech.stop as jest.Mock;

type StatusListener = (status: { didJustFinish: boolean }) => void;

function createMockPlayer() {
  const listeners: StatusListener[] = [];
  return {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((event: string, cb: StatusListener) => {
      if (event === 'playbackStatusUpdate') listeners.push(cb);
    }),
    _fireFinish: () => {
      for (const cb of listeners) cb({ didJustFinish: true });
    },
    _listeners: listeners,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  mockCreateAudioPlayer.mockImplementation(() => createMockPlayer());
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

  it('enqueues second clip instead of interrupting first', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    const firstPlayer = mockCreateAudioPlayer.mock.results[0].value;
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    // First player should NOT be removed — still playing
    expect(firstPlayer.remove).not.toHaveBeenCalled();
    // Only one player created so far
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it('plays queued clip after first finishes', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);

    // Simulate first clip finishing
    const firstPlayer = mockCreateAudioPlayer.mock.results[0].value;
    await act(async () => {
      firstPlayer._fireFinish();
    });

    // Second player should now be created
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
    const secondPlayer = mockCreateAudioPlayer.mock.results[1].value;
    expect(secondPlayer.play).toHaveBeenCalled();
  });

  it('isPlaying stays true between queued clips', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    expect(result.current.isPlaying).toBe(true);

    // First clip finishes — should still be playing (queue has second clip)
    const firstPlayer = mockCreateAudioPlayer.mock.results[0].value;
    await act(async () => {
      firstPlayer._fireFinish();
    });
    expect(result.current.isPlaying).toBe(true);

    // Second clip finishes — now idle
    const secondPlayer = mockCreateAudioPlayer.mock.results[1].value;
    await act(async () => {
      secondPlayer._fireFinish();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('stopAudio removes player and clears queue', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    const firstPlayer = mockCreateAudioPlayer.mock.results[0].value;

    await act(async () => {
      result.current.stopAudio();
    });
    expect(firstPlayer.pause).toHaveBeenCalled();
    expect(firstPlayer.remove).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);

    // Second clip should NOT play after stop
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
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

  it('isPlaying becomes false when single clip finishes', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    expect(result.current.isPlaying).toBe(true);

    const player = mockCreateAudioPlayer.mock.results[0].value;
    await act(async () => {
      player._fireFinish();
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

  it('stopAudio also stops expo-speech', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    await act(async () => {
      result.current.stopAudio();
    });
    expect(mockSpeechStop).toHaveBeenCalled();
  });

  it('aborts playback if stopAudio called during async setup', async () => {
    // Make setAudioModeAsync slow so we can stop mid-flight
    const deferred = (() => {
      let resolve = () => {};
      const promise = new Promise<void>((r) => { resolve = r; });
      return { promise, resolve };
    })();
    mockSetAudioMode.mockImplementationOnce(() => deferred.promise);

    const { result } = renderHook(() => useAudioPlayer());

    // Start playing — will await setAudioModeAsync
    let playPromise = Promise.resolve();
    await act(async () => {
      playPromise = result.current.playAudio('data', 'audio/mp3');
    });

    // Stop while setAudioModeAsync is pending
    await act(async () => {
      result.current.stopAudio();
    });

    // Now resolve setAudioModeAsync
    await act(async () => {
      deferred.resolve();
      await playPromise;
    });

    // Player should NOT have been created since stop was called
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('registers playbackStatusUpdate listener on native player', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data', 'audio/mp3');
    });
    const player = mockCreateAudioPlayer.mock.results[0].value;
    expect(player.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
  });

  describe('web platform', () => {
    let mockPlay: jest.Mock;
    let mockPause: jest.Mock;
    let lastAudioEl: { play: jest.Mock; pause: jest.Mock; onended: (() => void) | null };

    beforeEach(() => {
      Platform.OS = 'web';
      mockPlay = jest.fn().mockResolvedValue(undefined);
      mockPause = jest.fn();
      (window as unknown as Record<string, unknown>).Audio = jest.fn().mockImplementation(() => {
        lastAudioEl = {
          play: mockPlay,
          pause: mockPause,
          onended: null,
        };
        return lastAudioEl;
      });
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

    it('enqueues second clip on web instead of interrupting', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });
      // Only one Audio element created so far
      expect(window.Audio).toHaveBeenCalledTimes(1);
    });

    it('plays queued clip after first ends on web', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      const firstEl = lastAudioEl;
      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });

      // Simulate first clip ending
      await act(async () => {
        firstEl.onended?.();
      });

      expect(window.Audio).toHaveBeenCalledTimes(2);
      expect(result.current.isPlaying).toBe(true);
    });

    it('stopAudio pauses web audio and clears queue', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });
      await act(async () => {
        result.current.stopAudio();
      });
      expect(mockPause).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
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
