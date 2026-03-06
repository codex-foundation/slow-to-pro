import { emitWebNotificationFallback } from '@/utils/webNotificationFallback';

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';
export type BrowserNotificationTestResult =
  | 'shown'
  | 'not-supported'
  | 'permission-missing'
  | 'failed';

function supportsBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined';
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!supportsBrowserNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!supportsBrowserNotifications()) return 'unsupported';

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showBrowserTestNotification(): Promise<BrowserNotificationTestResult> {
  if (!supportsBrowserNotifications()) {
    emitWebNotificationFallback(
      'Browser notifications unavailable',
      'This browser/context does not support notifications.'
    );
    return 'not-supported';
  }

  if (Notification.permission !== 'granted') {
    emitWebNotificationFallback(
      'Notifications not enabled',
      'Click “Enable browser notifications” first, then try again.'
    );
    return 'permission-missing';
  }

  try {
    new Notification('Notification test', {
      body: 'Browser notifications are working 🎉',
    });
    emitWebNotificationFallback(
      'Test sent',
      'If you do not see a browser popup, check OS focus mode.'
    );
    return 'shown';
  } catch {
    emitWebNotificationFallback(
      'Notification failed',
      'The browser blocked this notification. Check site permission settings.'
    );
    return 'failed';
  }
}
