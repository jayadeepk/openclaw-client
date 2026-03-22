import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

/**
 * Provides a function to play base64-encoded audio received from the gateway.
 * Uses expo-av for playback and writes a temp file via expo-file-system.
 */
export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);

  /** Play base64 audio data. Automatically stops any currently playing audio. */
  const playAudio = useCallback(async (base64Audio: string, mimeType: string = 'audio/mp3') => {
    try {
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
    } catch (err) {
      console.warn('Audio playback failed:', err);
    }
  }, []);

  /** Stop any currently playing audio */
  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  return { playAudio, stopAudio };
}
