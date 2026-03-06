import { emitWebNotificationFallback } from '@/utils/webNotificationFallback';

function supportsBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined';
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (!supportsBrowserNotifications()) return false;
  return Notification.permission === 'granted';
}

async function showBrowserNotification(title: string, body: string): Promise<void> {
  const canNotify = await ensureNotificationPermission();
  if (!canNotify) {
    emitWebNotificationFallback(title, body);
    return;
  }

  try {
    new Notification(title, { body });
  } catch {
    // Some environments may still block notifications; keep this fail-safe.
    emitWebNotificationFallback(title, body);
  }
}

export async function scheduleOverBudgetNotification(
  categoryName: string,
  spent: number,
  limit: number
): Promise<void> {
  await showBrowserNotification(
    `Over budget: ${categoryName}`,
    `You've spent $${spent.toFixed(2)} of your $${limit.toFixed(2)} budget.`
  );
}

export async function scheduleTimerEndNotification(phase: 'work' | 'break'): Promise<void> {
  const isWork = phase === 'work';
  await showBrowserNotification(
    isWork ? 'Focus session complete!' : 'Break time over!',
    isWork ? 'Time to take a break.' : 'Ready to focus again?'
  );
}

export async function scheduleTaskReminderNotification(
  taskTitle: string,
  reminderAt: number
): Promise<void> {
  const delay = reminderAt - Date.now();
  if (delay <= 0) return;

  globalThis.setTimeout(() => {
    void showBrowserNotification('Task reminder', `Time to work on: ${taskTitle}`);
  }, delay);
}
