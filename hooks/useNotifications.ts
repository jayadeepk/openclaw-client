import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { PermissionStatus } from 'expo-modules-core';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: () => Promise.resolve({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export interface UseNotificationsReturn {
  /** Whether the app is currently in the background */
  isBackground: boolean;
  /** Whether notification permissions have been granted */
  hasPermission: boolean;
  /** Send a local notification */
  sendNotification: (title: string, body: string) => void;
}

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [isBackground, setIsBackground] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const isBackgroundRef = useRef(false);

  // Track app state
  useEffect(() => {
    const handleChange = (state: AppStateStatus) => {
      const bg = state !== 'active';
      isBackgroundRef.current = bg;
      setIsBackground(bg);
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => { sub.remove(); };
  }, []);

  // Request permissions on mount
  useEffect(() => {
    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === PermissionStatus.GRANTED) {
        setHasPermission(true);
      } else {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        setHasPermission(newStatus === PermissionStatus.GRANTED);
      }
      await setupAndroidChannel();
    })();
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!hasPermission) return;
    void Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // immediate
    });
  }, [hasPermission]);

  return { isBackground, hasPermission, sendNotification };
}
