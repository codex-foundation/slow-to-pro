export type BrowserNotificationPermission = 'unsupported';
export type BrowserNotificationTestResult = 'not-supported';

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  return 'unsupported';
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  return 'unsupported';
}

export async function showBrowserTestNotification(): Promise<BrowserNotificationTestResult> {
  // Native platforms use expo-notifications instead.
  return 'not-supported';
}
