import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import type { AudioPlayer } from 'expo-audio';

/** Normalize gateway format strings (e.g. "audio-24khz-48kbitrate-mono-mp3") to browser MIME types */
function toMimeType(format: string): string {
  if (format.includes('mp3') || format.includes('mpeg')) return 'audio/mpeg';
  if (format.includes('wav')) return 'audio/wav';
  if (format.includes('ogg')) return 'audio/ogg';
  if (format.includes('webm')) return 'audio/webm';
  return 'audio/mpeg'; // safe default
}

/**
 * Provides a function to play base64-encoded audio received from the gateway.
 * Native: writes a temp file via expo-file-system, plays with expo-audio.
 * Web: uses an HTMLAudioElement with a data URI.
 */
export function useAudioPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  /** Play base64 audio on web using a data URI */
  const playAudioWeb = useCallback((base64Audio: string, mimeType: string) => {
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      webAudioRef.current = null;
    }
    const browserMime = toMimeType(mimeType);
    const el = new window.Audio(`data:${browserMime};base64,${base64Audio}`);
    webAudioRef.current = el;
    el.onended = () => { webAudioRef.current = null; };
    void el.play().catch((e: unknown) => { console.warn('Web audio playback failed:', e); });
  }, []);

  /** Play base64 audio on native using expo-audio + temp file */
  const playAudioNative = useCallback(async (base64Audio: string, mimeType: string) => {
    // Stop previous player
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }

    // Configure audio mode for playback
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });

    // Determine file extension from MIME type
    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
    const file = new File(Paths.cache, `openclaw_tts_${String(Date.now())}.${ext}`);

    // Write the base64 audio to a temporary file
    file.write(base64Audio, { encoding: 'base64' });

    // Create player and play
    const player = createAudioPlayer({ uri: file.uri });
    playerRef.current = player;
    player.play();
  }, []);

  /** Play base64 audio data. Automatically stops any currently playing audio. */
  const playAudio = useCallback(async (base64Audio: string, mimeType: string = 'audio/mp3') => {
    try {
      if (Platform.OS === 'web') {
        playAudioWeb(base64Audio, mimeType);
      } else {
        await playAudioNative(base64Audio, mimeType);
      }
    } catch (err) {
      console.warn('Audio playback failed:', err);
    }
  }, [playAudioWeb, playAudioNative]);

  /** Stop any currently playing audio */
  const stopAudio = useCallback(() => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    } else {
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    }
  }, []);

  return { playAudio, stopAudio };
}
