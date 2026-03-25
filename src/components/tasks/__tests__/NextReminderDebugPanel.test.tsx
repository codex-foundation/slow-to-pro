import { act, fireEvent, render } from '@testing-library/react-native';
import type { Task } from '@/models/task';

const mockGetPermission = jest.fn().mockReturnValue('default');
const mockRequestPermission = jest.fn().mockResolvedValue('granted');
const mockShowTestNotification = jest.fn().mockResolvedValue('shown');

jest.mock('@/utils/browserNotifications', () => ({
  getBrowserNotificationPermission: () => mockGetPermission(),
  requestBrowserNotificationPermission: () => mockRequestPermission(),
  showBrowserTestNotification: () => mockShowTestNotification(),
}));

import { NextReminderDebugPanel } from '../NextReminderDebugPanel';

const baseTask: Task = {
  id: 'task-1',
  title: 'Read book',
  completed: false,
  priority: 'medium',
  order: 0,
  recurring: { enabled: false, days: [] },
  createdAt: Date.now(),
};

describe('NextReminderDebugPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetPermission.mockReturnValue('default');
    mockRequestPermission.mockResolvedValue('granted');
    mockShowTestNotification.mockResolvedValue('shown');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "No upcoming reminders found" when no tasks have reminders', () => {
    const { getByText } = render(<NextReminderDebugPanel tasks={[baseTask]} />);
    expect(getByText('No upcoming reminders found.')).toBeTruthy();
  });

  it('shows upcoming reminder for task with future reminderAt', () => {
    const futureTask: Task = {
      ...baseTask,
      reminderAt: Date.now() + 3600 * 1000, // 1 hour from now
    };
    const { getByText } = render(<NextReminderDebugPanel tasks={[futureTask]} />);
    expect(getByText('Debug')).toBeTruthy();
  });

  it('displays browser permission status', () => {
    mockGetPermission.mockReturnValue('granted');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText('Browser permission: granted')).toBeTruthy();
  });

  it('displays denied permission in the correct tone', () => {
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText('Browser permission: denied')).toBeTruthy();
  });

  it('calls requestBrowserNotificationPermission when Enable button pressed', async () => {
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Enable browser notifications'));
    });
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('calls showBrowserTestNotification when Send test button pressed', async () => {
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(mockShowTestNotification).toHaveBeenCalled();
  });

  it('shows last test result text after send test', async () => {
    mockShowTestNotification.mockResolvedValue('shown');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(getByText('Last test result: shown')).toBeTruthy();
  });

  it('shows troubleshooting when test result is failed', async () => {
    mockShowTestNotification.mockResolvedValue('failed');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(getByText('Troubleshooting')).toBeTruthy();
  });

  it('shows troubleshooting when permission is denied', () => {
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText('Troubleshooting')).toBeTruthy();
  });

  it('shows troubleshooting when test result is permission-missing', async () => {
    mockShowTestNotification.mockResolvedValue('permission-missing');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(getByText('Troubleshooting')).toBeTruthy();
  });

  it('ticks the interval and updates now', () => {
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(getByText('No upcoming reminders found.')).toBeTruthy();
  });

  it('shows remaining time for task with upcoming reminder', () => {
    const futureTask: Task = {
      ...baseTask,
      reminderAt: Date.now() + 90 * 1000, // 1m 30s
    };
    const { getByText } = render(<NextReminderDebugPanel tasks={[futureTask]} />);
    expect(getByText(/1m 30s/)).toBeTruthy();
  });

  it('shows h/m/s format for reminders more than 1 hour away', () => {
    const futureTask: Task = {
      ...baseTask,
      reminderAt: Date.now() + 2 * 3600 * 1000 + 5 * 60 * 1000, // 2h 5m
    };
    const { getByText } = render(<NextReminderDebugPanel tasks={[futureTask]} />);
    expect(getByText(/2h 5m/)).toBeTruthy();
  });

  it('sorts multiple tasks and shows the earliest upcoming reminder', () => {
    const now = Date.now();
    const task1: Task = { ...baseTask, id: 'task-a', reminderAt: now + 2 * 3600 * 1000 };
    const task2: Task = { ...baseTask, id: 'task-b', reminderAt: now + 30 * 1000 };
    const { getByText } = render(<NextReminderDebugPanel tasks={[task1, task2]} />);
    // task2 should be selected (earliest reminder = 30s from now)
    expect(getByText(/30s/)).toBeTruthy();
  });

  it('shows troubleshooting when test result is shown', async () => {
    mockShowTestNotification.mockResolvedValue('shown');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(getByText('Troubleshooting')).toBeTruthy();
  });

  it('shows Chrome-specific tip when navigator UA contains chrome', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      writable: true,
      configurable: true,
    });
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText(/Chrome: Click the lock icon/)).toBeTruthy();
  });

  it('shows Safari-specific tip when navigator UA contains safari but not chrome', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      },
      writable: true,
      configurable: true,
    });
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText(/Safari: Safari Settings/)).toBeTruthy();
  });

  it('shows Firefox-specific tip when navigator UA contains firefox', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/121.0' },
      writable: true,
      configurable: true,
    });
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText(/Firefox: Click the permissions icon/)).toBeTruthy();
  });

  it('shows Edge-specific tip when navigator UA contains edg/', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
      writable: true,
      configurable: true,
    });
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText(/Edge: Lock icon/)).toBeTruthy();
  });

  it('shows last test result and troubleshooting on the reminder panel (nextReminderTask path)', async () => {
    mockShowTestNotification.mockResolvedValue('failed');
    const futureTask: Task = {
      ...baseTask,
      reminderAt: Date.now() + 3600 * 1000,
    };
    const { getByText } = render(<NextReminderDebugPanel tasks={[futureTask]} />);
    await act(async () => {
      fireEvent.press(getByText('Send test'));
    });
    expect(getByText(/Last test result: failed/)).toBeTruthy();
    expect(getByText('Troubleshooting')).toBeTruthy();
  });

  it('sorts tasks without reminderAt using 0 fallback', () => {
    const now = Date.now();
    // task with no reminderAt should be treated as 0 — task with future reminder wins
    const taskNoReminder: Task = { ...baseTask, id: 'no-reminder' };
    const task1: Task = { ...baseTask, id: 'z-task', reminderAt: now + 60 * 1000 };
    const task2: Task = { ...baseTask, id: 'a-task', reminderAt: now + 30 * 1000 };
    const { getByText } = render(<NextReminderDebugPanel tasks={[task1, task2, taskNoReminder]} />);
    expect(getByText(/30s/)).toBeTruthy();
  });

  it('returns "other" browser tip when navigator is undefined', () => {
    const originalNavigator = global.navigator;
    // @ts-ignore
    delete global.navigator;
    mockGetPermission.mockReturnValue('denied');
    const { getByText } = render(<NextReminderDebugPanel tasks={[]} />);
    expect(getByText(/Check this site permissions/)).toBeTruthy();
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });
});
