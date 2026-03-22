import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import type { AudioPlayer } from 'expo-audio';

interface QueuedClip {
  base64Audio: string;
  mimeType: string;
}

/** Normalize gateway format strings (e.g. "audio-24khz-48kbitrate-mono-mp3") to browser MIME types */
function toMimeType(format: string): string {
  if (format.includes('mp3') || format.includes('mpeg')) return 'audio/mpeg';
  if (format.includes('wav')) return 'audio/wav';
  if (format.includes('ogg')) return 'audio/ogg';
  if (format.includes('webm')) return 'audio/webm';
  return 'audio/mpeg'; // safe default
}

/**
 * Provides audio playback with a queue. When a clip is already playing,
 * new clips are enqueued and played automatically in order.
 */
export function useAudioPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueuedClip[]>([]);
  const playingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // Ref to break circular dependency between play functions and advanceQueue
  const advanceQueueRef = useRef<() => void>(() => {});
  // Incremented on stop to cancel any in-flight async playback
  const generationRef = useRef(0);
  // When true, playAudio rejects until explicitly resumed
  const stoppedRef = useRef(false);

  const updateIsPlaying = useCallback((value: boolean) => {
    playingRef.current = value;
    setIsPlaying(value);
  }, []);

  /** Play a single clip on web */
  const playWebClip = useCallback((base64Audio: string, mimeType: string) => {
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      webAudioRef.current = null;
    }
    const browserMime = toMimeType(mimeType);
    const el = new window.Audio(`data:${browserMime};base64,${base64Audio}`);
    webAudioRef.current = el;
    el.onended = () => {
      webAudioRef.current = null;
      advanceQueueRef.current();
    };
    void el.play().catch((e: unknown) => {
      console.warn('Web audio playback failed:', e);
      webAudioRef.current = null;
      advanceQueueRef.current();
    });
  }, []);

  /** Play a single clip on native */
  const playNativeClip = useCallback(async (base64Audio: string, mimeType: string) => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.remove();
      playerRef.current = null;
    }

    const gen = generationRef.current;

    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });

    // If stopAudio was called during the await, abort
    if (generationRef.current !== gen) return;

    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
    const file = new File(Paths.cache, `openclaw_tts_${String(Date.now())}.${ext}`);
    file.write(base64Audio, { encoding: 'base64' });

    const player = createAudioPlayer({ uri: file.uri });
    playerRef.current = player;

    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.remove();
        if (playerRef.current === player) {
          playerRef.current = null;
        }
        advanceQueueRef.current();
      }
    });

    player.play();
  }, []);

  /** Play the next clip from the queue, or mark idle if empty */
  const advanceQueue = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      updateIsPlaying(false);
      return;
    }
    if (Platform.OS === 'web') {
      playWebClip(next.base64Audio, next.mimeType);
    } else {
      void playNativeClip(next.base64Audio, next.mimeType);
    }
  }, [updateIsPlaying, playWebClip, playNativeClip]);

  // Keep the ref in sync
  advanceQueueRef.current = advanceQueue;

  /** Enqueue a clip. If nothing is playing, start immediately. */
  const playAudio = useCallback(async (base64Audio: string, mimeType: string = 'audio/mp3') => {
    try {
      // Reject if stopAudio was called and no new playback started yet
      if (stoppedRef.current) return;
      if (playingRef.current) {
        queueRef.current.push({ base64Audio, mimeType });
        return;
      }
      updateIsPlaying(true);
      if (Platform.OS === 'web') {
        playWebClip(base64Audio, mimeType);
      } else {
        await playNativeClip(base64Audio, mimeType);
      }
    } catch (err) {
      console.warn('Audio playback failed:', err);
      advanceQueue();
    }
  }, [updateIsPlaying, playWebClip, playNativeClip, advanceQueue]);

  /** Stop current playback and clear the entire queue.
   *  After stop, new playAudio calls are rejected until resumeAudio is called. */
  const stopAudio = useCallback(() => {
    stoppedRef.current = true;
    generationRef.current += 1;
    queueRef.current = [];
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.onended = null;
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
    }
    // Also stop device TTS in case it's the audio source
    void Speech.stop();
    updateIsPlaying(false);
  }, [updateIsPlaying]);

  /** Re-enable playAudio after a stop. Called when a new user message is sent. */
  const resumeAudio = useCallback(() => {
    stoppedRef.current = false;
  }, []);

  return { playAudio, stopAudio, resumeAudio, isPlaying };
}
