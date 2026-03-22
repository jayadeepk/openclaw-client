import { Platform, Vibration } from 'react-native';

/** Light haptic tap — 10ms vibration on Android, no-op on web */
export function lightTap(): void {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(10);
  }
}
