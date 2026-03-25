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

  it('rejects playAudio after stopAudio until resumeAudio is called', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Play a clip, then stop
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.stopAudio();
    });

    // New playAudio calls should be silently rejected
    await act(async () => {
      await result.current.playAudio('after-stop-1', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('after-stop-2', 'audio/mp3');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1); // no new players
    expect(result.current.isPlaying).toBe(false);

    // After resumeAudio, playAudio works again
    await act(async () => {
      result.current.resumeAudio();
    });
    await act(async () => {
      await result.current.playAudio('resumed', 'audio/mp3');
    });
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
    expect(result.current.isPlaying).toBe(true);
  });

  it('shouldSpeak returns false after stop and true after resume', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    expect(result.current.shouldSpeak()).toBe(true);

    await act(async () => {
      result.current.stopAudio();
    });
    expect(result.current.shouldSpeak()).toBe(false);

    await act(async () => {
      result.current.resumeAudio();
    });
    expect(result.current.shouldSpeak()).toBe(true);
  });

  it('uses default mimeType when called without format argument', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('data');
    });
    // Should use default 'audio/mp3' — creates player with .mp3 extension
    const constructorCall = MockFile.mock.calls[0];
    expect(constructorCall[1]).toMatch(/\.mp3$/);
  });

  it('ignores duplicate didJustFinish events from native player', async () => {
    const { result } = renderHook(() => useAudioPlayer());
    await act(async () => {
      await result.current.playAudio('first', 'audio/mp3');
    });
    await act(async () => {
      await result.current.playAudio('second', 'audio/mp3');
    });
    expect(result.current.isPlaying).toBe(true);

    // Simulate first clip firing didJustFinish TWICE (expo-audio quirk)
    const firstPlayer = mockCreateAudioPlayer.mock.results[0].value;
    await act(async () => {
      firstPlayer._fireFinish();
    });
    // Second clip should now be playing — isPlaying must stay true
    expect(result.current.isPlaying).toBe(true);
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);

    // Fire didJustFinish again from the FIRST player (duplicate event)
    await act(async () => {
      firstPlayer._fireFinish();
    });
    // isPlaying must still be true — the duplicate must be ignored
    expect(result.current.isPlaying).toBe(true);
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
    let lastAudioEl: { play: jest.Mock; pause: jest.Mock; onended: (() => void) | null; paused?: boolean };

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

    it('stopAudio is safe on web when nothing is playing', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        result.current.stopAudio();
      });
      expect(mockPause).not.toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
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

    it('does not advance queue when play() rejects but audio is actually playing', async () => {
      // Simulate browser quirk: play() rejects but audio still plays
      mockPlay.mockRejectedValueOnce(new DOMException('NotAllowedError'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      const firstEl = lastAudioEl;
      // Make second clip's play() also reject but audio plays (paused = false)
      mockPlay.mockRejectedValueOnce(new DOMException('NotAllowedError'));

      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });

      // Simulate first clip ending → plays second clip from queue
      // The second clip's play() will reject, but the element isn't paused
      Object.defineProperty(lastAudioEl, 'paused', { value: false, writable: true });
      await act(async () => {
        firstEl.onended?.();
      });
      // Allow the rejected play() promise to settle
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // isPlaying should remain true because the audio is actually playing
      expect(result.current.isPlaying).toBe(true);

      warnSpy.mockRestore();
    });

    it('normalizes wav format to audio/wav MIME type', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/wav');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/wav;base64,data');
    });

    it('normalizes ogg format to audio/ogg MIME type', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/ogg');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/ogg;base64,data');
    });

    it('normalizes webm format to audio/webm MIME type', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/webm');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/webm;base64,data');
    });

    it('defaults unknown format to audio/mpeg', async () => {
      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('data', 'audio/flac');
      });
      expect(window.Audio).toHaveBeenCalledWith('data:audio/mpeg;base64,data');
    });

    it('advances queue when play() truly fails (el.paused is true)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useAudioPlayer());
      await act(async () => {
        await result.current.playAudio('first', 'audio/mp3');
      });
      const firstEl = lastAudioEl;
      // Queue a second clip whose play() will reject
      mockPlay.mockRejectedValueOnce(new DOMException('NotSupportedError'));

      await act(async () => {
        await result.current.playAudio('second', 'audio/mp3');
      });

      // Override Audio mock so the NEXT element created has paused=true
      const origAudio = (window as unknown as Record<string, unknown>).Audio;
      (window as unknown as Record<string, unknown>).Audio = jest.fn().mockImplementation(() => {
        lastAudioEl = {
          play: mockPlay,
          pause: mockPause,
          onended: null,
          paused: true, // truly failed — audio did not start
        };
        return lastAudioEl;
      });

      // Simulate first clip ending → plays second clip from queue
      // The second clip's play() will reject and el.paused is true (real failure)
      await act(async () => {
        firstEl.onended?.();
      });
      // Allow the rejected play() promise to settle
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Queue is empty after the failed clip, so isPlaying should become false
      expect(result.current.isPlaying).toBe(false);

      (window as unknown as Record<string, unknown>).Audio = origAudio;
      warnSpy.mockRestore();
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
