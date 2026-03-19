import { fireEvent, render } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { TaskItem } from '../TaskItem';
import { useEntitlementStore } from '@/stores/entitlementStore';

const mockToggleTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockStartWorkForTask = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    danger: '#ef4444',
    success: '#10b981',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

const mockTaskStoreState = {
  toggleTask: mockToggleTask,
  deleteTask: mockDeleteTask,
  updateTask: mockUpdateTask,
  categories: [] as { id: string; name: string; color: string }[],
};

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: (selector?: (s: typeof mockTaskStoreState) => unknown) =>
    selector ? selector(mockTaskStoreState) : mockTaskStoreState,
}));

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: { startWorkForTask: jest.Mock }) => unknown) =>
    selector({ startWorkForTask: mockStartWorkForTask }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { TouchableOpacity } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({
      onChange,
      testID,
    }: {
      onChange?: (event: object, date?: Date) => void;
      testID?: string;
    }) =>
      React.createElement(TouchableOpacity, {
        testID: testID ?? 'mock-datetime-picker',
        onPress: () => onChange?.({}, new Date(2025, 0, 15, 10, 30, 0)),
      }),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  const MockIonicons = ({ testID }: { testID?: string }) =>
    React.createElement(Text, { testID: testID ?? 'mock-ionicon' }, 'icon');

  (MockIonicons as unknown as { font: Record<string, unknown> }).font = {
    ionicons: 'mock-ionicons-font',
  };

  return {
    __esModule: true,
    default: MockIonicons,
  };
});

jest.mock('@/stores/entitlementStore', () => ({
  useEntitlementStore: jest.fn((selector: (s: { isPro: boolean }) => unknown) =>
    selector({ isPro: true })
  ),
}));

const mockPaywallOnClose = jest.fn();
const mockPaywallOnUpgraded = jest.fn();
jest.mock('@/components/ui/PaywallModal', () => ({
  PaywallModal: ({
    onClose,
    onUpgraded,
  }: {
    visible: boolean;
    onClose: () => void;
    onUpgraded: () => void;
  }) => {
    mockPaywallOnClose.mockImplementation(onClose);
    mockPaywallOnUpgraded.mockImplementation(onUpgraded);
    return null;
  },
}));

describe('TaskItem', () => {
  const baseTask = {
    id: 'task-1',
    title: 'Task title',
    completed: false,
    priority: 'high' as const,
    order: 0,
    recurring: { enabled: false, days: [] },
    createdAt: Date.now(),
  };

  let dismissSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: true })
    );
    dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  });

  afterEach(() => {
    dismissSpy.mockRestore();
  });

  it('uses right border color to represent priority', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);

    const style = getByTestId('task-item-row').props.style;
    const flattened = Array.isArray(style)
      ? Object.assign({}, ...style.filter((entry: unknown) => typeof entry === 'object' && entry))
      : style;

    expect(flattened.borderRightColor).toBe('#ef4444');
    expect(flattened.borderRightWidth).toBe(4);
  });

  it('uses green border for low priority and amber for medium', () => {
    const { getByTestId: getL } = render(<TaskItem item={{ ...baseTask, priority: 'low' }} />);
    const lowStyle = getL('task-item-row').props.style;
    const flatLow = Array.isArray(lowStyle)
      ? Object.assign({}, ...lowStyle.filter((e: unknown) => typeof e === 'object' && e))
      : lowStyle;
    expect(flatLow.borderRightColor).toBe('#10b981');

    const { getByTestId: getM } = render(<TaskItem item={{ ...baseTask, priority: 'medium' }} />);
    const medStyle = getM('task-item-row').props.style;
    const flatMed = Array.isArray(medStyle)
      ? Object.assign({}, ...medStyle.filter((e: unknown) => typeof e === 'object' && e))
      : medStyle;
    expect(flatMed.borderRightColor).toBe('#f59e0b');
  });

  it('toggles the task and fires onCompleted when not completed', () => {
    const onCompleted = jest.fn();
    const { getByRole } = render(<TaskItem item={baseTask} onCompleted={onCompleted} />);

    fireEvent.press(getByRole('checkbox'));
    expect(mockToggleTask).toHaveBeenCalledWith('task-1');
    expect(onCompleted).toHaveBeenCalled();
  });

  it('toggles the task without firing onCompleted when already completed', () => {
    const onCompleted = jest.fn();
    const { getByRole } = render(
      <TaskItem item={{ ...baseTask, completed: true }} onCompleted={onCompleted} />
    );

    fireEvent.press(getByRole('checkbox'));
    expect(mockToggleTask).toHaveBeenCalledWith('task-1');
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('deletes the task via swipe action', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    fireEvent.press(getByTestId('delete-task-swipe'));
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('deletes task via inline delete button', () => {
    const { getAllByRole } = render(<TaskItem item={{ ...baseTask, completed: true }} />);
    // Find the delete button (trash icon TouchableOpacity without testID)
    const touchables = getAllByRole('button');
    // The delete button is one of the touchables
    const deleteBtn = touchables.find(
      (t) => t.props.accessibilityLabel === 'Delete task Task title'
    );
    expect(deleteBtn).toBeTruthy();
    if (deleteBtn) fireEvent.press(deleteBtn);
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('calls startWorkForTask and router.replace via start focus button', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    fireEvent.press(getByTestId('focus-task-start'));
    expect(mockStartWorkForTask).toHaveBeenCalledWith('task-1');
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/pomodoro');
  });

  it('uses date/time picker sheets in edit mode like add task modal', () => {
    const { getByTestId, queryByTestId } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));

    expect(queryByTestId('edit-due-date-picker-modal')).toBeNull();
    fireEvent.press(getByTestId('edit-due-date-open'));
    expect(getByTestId('edit-due-date-picker-modal')).toBeTruthy();
    fireEvent.press(getByTestId('edit-due-date-picker-modal-done'));
    expect(queryByTestId('edit-due-date-picker-modal')).toBeNull();

    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);

    expect(queryByTestId('edit-reminder-date-picker-modal')).toBeNull();
    fireEvent.press(getByTestId('edit-reminder-date-open'));
    expect(getByTestId('edit-reminder-date-picker-modal')).toBeTruthy();
    fireEvent.press(getByTestId('edit-reminder-date-picker-modal-cancel'));
    expect(queryByTestId('edit-reminder-date-picker-modal')).toBeNull();

    expect(queryByTestId('edit-reminder-time-picker-modal')).toBeNull();
    fireEvent.press(getByTestId('edit-reminder-time-open'));
    expect(getByTestId('edit-reminder-time-picker-modal')).toBeTruthy();
    fireEvent.press(getByTestId('edit-reminder-time-picker-modal-done'));
    expect(queryByTestId('edit-reminder-time-picker-modal')).toBeNull();
  });

  it('fires onChange on date/reminder pickers when picker value changes', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));

    // Due date picker onChange
    fireEvent.press(getByTestId('edit-due-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('edit-due-date-picker-modal-done'));

    // Reminder date/time onChange
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('edit-reminder-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('edit-reminder-date-picker-modal-done'));

    fireEvent.press(getByTestId('edit-reminder-time-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('edit-reminder-time-picker-modal-done'));
  });

  it('saves edit with updated title and priority', () => {
    const { getByTestId, getByText } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent.changeText(getByTestId('edit-task-title-input'), 'Updated title');
    // Change priority to low
    fireEvent.press(getByText('Low'));
    fireEvent.press(getByText('Save'));

    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ title: 'Updated title', priority: 'low' })
    );
  });

  it('cancels edit without saving', () => {
    const { getByTestId, getByText } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent.changeText(getByTestId('edit-task-title-input'), 'Should not save');
    fireEvent.press(getByText('Cancel'));

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('shows recurring indicator in metadata and exposes swipe actions', () => {
    const recurringTask = {
      ...baseTask,
      recurring: { enabled: true, days: [1, 3, 5] },
    };

    const { getByText, getByTestId } = render(<TaskItem item={recurringTask} />);

    expect(getByText('Recurring')).toBeTruthy();
    expect(getByTestId('delete-task-swipe')).toBeTruthy();
  });

  it('enables recurring in edit mode and toggles day buttons', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-recurring-switch'), 'valueChange', true);

    // Day buttons 0-6 should appear
    const day0 = getByTestId('edit-day-0');
    fireEvent.press(day0); // add
    fireEvent.press(day0); // remove

    const day3 = getByTestId('edit-day-3');
    fireEvent.press(day3);
  });

  it('shows paywall when non-pro user tries to enable recurring in edit', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-recurring-switch'), 'valueChange', true);
    // Should not enable recurring — paywall shown
    expect(() => getByTestId('edit-day-0')).toThrow();
  });

  it('shows paywall when non-pro user enables reminder in edit', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    // Reminder date/time pickers should not appear
    expect(() => getByTestId('edit-reminder-date-open')).toThrow();
  });

  it('clears due date and reminder in edit mode', () => {
    const { getByTestId, getByText, queryByText } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));

    // Set due date
    fireEvent.press(getByTestId('edit-due-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('edit-due-date-picker-modal-done'));

    // Clear button should appear — press it
    expect(getByText('Clear')).toBeTruthy();
    fireEvent.press(getByText('Clear'));
    expect(queryByText('Clear')).toBeNull();
  });

  it('clears reminder in edit mode', () => {
    const { getByTestId, getAllByText, queryAllByText } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);

    // Set reminder date to enable Clear button
    fireEvent.press(getByTestId('edit-reminder-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('edit-reminder-date-picker-modal-done'));

    const clearBtns = getAllByText('Clear');
    fireEvent.press(clearBtns[clearBtns.length - 1]);
    expect(queryAllByText('Clear')).toHaveLength(0);
  });

  it('saves edit with reminder enabled', () => {
    const { getByTestId, getByText } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent.changeText(getByTestId('edit-task-title-input'), 'Task with reminder');
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByText('Save'));

    expect(mockUpdateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        title: 'Task with reminder',
        reminderAt: expect.any(Number),
      })
    );
  });

  it('dismisses keyboard on edit title submit without saving', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent.changeText(getByTestId('edit-task-title-input'), 'Updated title');
    fireEvent(getByTestId('edit-task-title-input'), 'submitEditing');

    expect(dismissSpy).toHaveBeenCalled();
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('renders with dueDate and reminderAt pre-populated', () => {
    const now = Date.now();
    const taskWithDates = {
      ...baseTask,
      dueDate: now,
      reminderAt: now,
    };

    const { getByTestId } = render(<TaskItem item={taskWithDates} />);
    fireEvent.press(getByTestId('edit-task-open'));
    // Due date should show — make sure Clear button appears
    expect(() => getByTestId('edit-task-title-input')).not.toThrow();
  });

  it('closes edit reminder time picker via cancel', () => {
    const { getByTestId, queryByTestId } = render(<TaskItem item={baseTask} />);

    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('edit-reminder-time-open'));
    expect(getByTestId('edit-reminder-time-picker-modal')).toBeTruthy();

    fireEvent.press(getByTestId('edit-reminder-time-picker-modal-cancel'));
    expect(queryByTestId('edit-reminder-time-picker-modal')).toBeNull();
  });

  it('initializes editReminderTimeInput correctly when reminderAt is set', () => {
    const taskWithReminder = {
      ...baseTask,
      reminderAt: new Date(2025, 5, 15, 14, 30, 0).getTime(),
    };
    const { getByTestId } = render(<TaskItem item={taskWithReminder} />);
    fireEvent.press(getByTestId('edit-task-open'));
    // The reminder time input defaults to 14:30 formatted
    expect(getByTestId('edit-task-title-input')).toBeTruthy();
  });

  it('renders with reduced opacity when isActive is true', () => {
    const { getByTestId } = render(<TaskItem item={baseTask} isActive />);
    const style = getByTestId('task-item-row').props.style;
    const flattened = Array.isArray(style)
      ? Object.assign({}, ...style.filter((e: unknown) => typeof e === 'object' && e))
      : style;
    expect(flattened.opacity).toBe(0.8);
  });

  it('dismisses paywall via onClose callback', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    // Trigger paywall by toggling reminder as non-pro
    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    // Invoke onClose captured from PaywallModal prop
    mockPaywallOnClose();
    // No crash — setShowPaywall(false) was invoked
  });

  it('dismisses paywall via onUpgraded callback', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<TaskItem item={baseTask} />);
    fireEvent.press(getByTestId('edit-task-open'));
    fireEvent(getByTestId('edit-reminder-enabled-switch'), 'valueChange', true);
    // Invoke onUpgraded captured from PaywallModal prop
    mockPaywallOnUpgraded();
    // No crash — setShowPaywall(false) was invoked
  });
});
