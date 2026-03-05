import * as Notifications from 'expo-notifications';

export async function scheduleOverBudgetNotification(
  categoryName: string,
  spent: number,
  limit: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Over budget: ${categoryName}`,
      body: `You've spent $${spent.toFixed(2)} of your $${limit.toFixed(2)} budget.`,
    },
    trigger: null, // fire immediately
  });
}

export async function scheduleTimerEndNotification(phase: 'work' | 'break'): Promise<void> {
  const isWork = phase === 'work';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isWork ? 'Focus session complete!' : 'Break time over!',
      body: isWork ? 'Time to take a break.' : 'Ready to focus again?',
    },
    trigger: null,
  });
}

export async function scheduleTaskReminderNotification(
  taskTitle: string,
  reminderAt: number
): Promise<void> {
  const triggerDate = new Date(reminderAt);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Task reminder',
      body: `Time to work on: ${taskTitle}`,
    },
    trigger: triggerDate,
  });
}
