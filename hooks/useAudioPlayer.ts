import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

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
 * Native: writes a temp file via expo-file-system, plays with expo-av.
 * Web: uses an HTMLAudioElement with a data URI.
 */
export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
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

  /** Play base64 audio on native using expo-av + temp file */
  const playAudioNative = useCallback(async (base64Audio: string, mimeType: string) => {
    // Stop previous sound if still playing
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Determine file extension from MIME type
    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
    const file = new File(Paths.cache, `openclaw_tts_${String(Date.now())}.${ext}`);

    // Write the base64 audio to a temporary file
    file.write(base64Audio, { encoding: 'base64' });

    // Load and play
    const { sound } = await Audio.Sound.createAsync({ uri: file.uri }, { shouldPlay: true });
    soundRef.current = sound;

    // Clean up when playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        soundRef.current = null;
        // Remove temp file
        try { file.delete(); } catch { /* best-effort cleanup */ }
      }
    });
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
  const stopAudio = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    } else {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    }
  }, []);

  return { playAudio, stopAudio };
}
