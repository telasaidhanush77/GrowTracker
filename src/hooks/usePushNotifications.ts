import { useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface UsePushNotificationsResult {
  status: NotificationPermissionStatus;
  pushToken: string | null;
  register: () => Promise<void>;
  openSettings: () => void;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [pushToken, setPushToken] = useState<string | null>(null);

  const register = useCallback(async (): Promise<void> => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      finalStatus = requested;
    }

    setStatus(finalStatus as NotificationPermissionStatus);

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    if (!Constants.isDevice) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      setPushToken(tokenData.data);
    } catch {
      // Token unavailable on simulator or when projectId is missing
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, pushToken, register, openSettings };
}
