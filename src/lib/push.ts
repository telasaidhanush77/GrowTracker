import * as Notifications from 'expo-notifications';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPush(token: string, payload: PushPayload): Promise<void> {
  if (!token.startsWith('ExponentPushToken[')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
        priority: 'high',
      }),
    });
  } catch {
    // Best-effort — don't let push failures block the main flow
  }
}

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
