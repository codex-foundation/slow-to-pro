import * as Notifications from 'expo-notifications';

import {
  scheduleOverBudgetNotification,
  scheduleTaskReminderNotification,
  scheduleTimerEndNotification,
} from '../notifications';

jest.mock('expo-notifications');

describe('notifications utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleTaskReminderNotification', () => {
    it('schedules a DATE trigger for future reminders', async () => {
      const reminderAt = Date.now() + 10 * 60 * 1000;

      await scheduleTaskReminderNotification('Write tests', reminderAt);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Task reminder',
          body: 'Time to work on: Write tests',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(reminderAt),
        },
      });
    });

    it('does not schedule when reminderAt is in the past', async () => {
      await scheduleTaskReminderNotification('Past task', Date.now() - 1_000);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does not schedule when reminderAt is invalid', async () => {
      await scheduleTaskReminderNotification('Broken timestamp', Number.NaN);

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('existing immediate notification helpers', () => {
    it('scheduleOverBudgetNotification still uses immediate trigger', async () => {
      await scheduleOverBudgetNotification('Food', 125.4, 100);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Over budget: Food',
          body: "You've spent $125.40 of your $100.00 budget.",
        },
        trigger: null,
      });
    });

    it('scheduleTimerEndNotification still uses immediate trigger', async () => {
      await scheduleTimerEndNotification('work');

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Focus session complete!',
          body: 'Time to take a break.',
        },
        trigger: null,
      });
    });
  });
});
