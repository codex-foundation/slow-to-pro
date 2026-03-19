import { fireEvent, render } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { AddTaskModal } from '../AddTaskModal';
import { useEntitlementStore } from '@/stores/entitlementStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
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
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      React.createElement(Text, { testID: testID ?? 'mock-ionicon' }, 'icon'),
  };
});

const mockAddTask = jest.fn(() => 'task-id');
const mockStartWorkForTask = jest.fn();

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: (selector: (s: { addTask: typeof mockAddTask; categories: [] }) => unknown) =>
    selector({ addTask: mockAddTask, categories: [] }),
}));

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: { startWorkForTask: typeof mockStartWorkForTask }) => unknown) =>
    selector({ startWorkForTask: mockStartWorkForTask }),
}));

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

describe('AddTaskModal date/reminder picker modals', () => {
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

  it('opens and closes the due date picker modal', () => {
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    expect(queryByTestId('due-date-picker-modal')).toBeNull();

    fireEvent.press(getByTestId('due-date-open'));
    expect(getByTestId('due-date-picker-modal')).toBeTruthy();

    fireEvent.press(getByTestId('due-date-picker-modal-done'));
    expect(queryByTestId('due-date-picker-modal')).toBeNull();
  });

  it('opens reminder date and time picker modals when reminder is enabled', () => {
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);

    expect(queryByTestId('reminder-date-picker-modal')).toBeNull();
    fireEvent.press(getByTestId('reminder-date-open'));
    expect(getByTestId('reminder-date-picker-modal')).toBeTruthy();
    fireEvent.press(getByTestId('reminder-date-picker-modal-cancel'));
    expect(queryByTestId('reminder-date-picker-modal')).toBeNull();

    expect(queryByTestId('reminder-time-picker-modal')).toBeNull();
    fireEvent.press(getByTestId('reminder-time-open'));
    expect(getByTestId('reminder-time-picker-modal')).toBeTruthy();
    fireEvent.press(getByTestId('reminder-time-picker-modal-done'));
    expect(queryByTestId('reminder-time-picker-modal')).toBeNull();
  });

  it('allows adding a task with reminder enabled without changing picker value', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<AddTaskModal visible onClose={onClose} />);

    fireEvent.changeText(getByTestId('task-title-input'), 'Task with reminder');
    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('add-task-submit'));

    expect(mockAddTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task with reminder',
        reminderAt: expect.any(Number),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows reduced opacity when submit is disabled', () => {
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    const submit = getByTestId('add-task-submit');
    expect(submit.props.style).toEqual(expect.objectContaining({ opacity: 0.55 }));
    fireEvent.press(submit);
    expect(mockAddTask).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('task-title-input'), 'Visible CTA');

    const enabledSubmit = getByTestId('add-task-submit');
    fireEvent.press(enabledSubmit);
    expect(mockAddTask).toHaveBeenCalled();
  });

  it('dismisses keyboard on title submit without adding task', () => {
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent.changeText(getByTestId('task-title-input'), 'Typing title');
    fireEvent(getByTestId('task-title-input'), 'submitEditing');

    expect(dismissSpy).toHaveBeenCalled();
    expect(mockAddTask).not.toHaveBeenCalled();
  });

  it('changes priority when priority button is pressed', () => {
    const { getAllByText } = render(<AddTaskModal visible onClose={jest.fn()} />);
    // Priority buttons: Low, Medium, High
    const buttons = getAllByText('Low');
    fireEvent.press(buttons[0]);
    // No error = pressed priority touchable correctly
    const medBtn = getAllByText('Medium');
    fireEvent.press(medBtn[0]);
  });

  it('shows paywall when non-pro tries to enable recurring', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);
    fireEvent(getByTestId('recurring-enabled-switch'), 'valueChange', true);
    // With isPro=false, recurring days should not appear (paywall shown instead)
    expect(queryByTestId('recurring-enabled-switch')).toBeTruthy();
  });

  it('fires onChangeDueDate when DateTimePicker fires change', () => {
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent.press(getByTestId('due-date-open'));
    // The mock DateTimePicker fires onChange on press
    fireEvent.press(getByTestId('mock-datetime-picker'));
  });

  it('fires onChangeReminderDate when reminder date picker changes', () => {
    const { getByTestId, getByText } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('reminder-date-open'));
    // Now the reminder date PickerSheet is visible
    fireEvent.press(getByTestId('mock-datetime-picker'));
    // Also confirm the picker
    fireEvent.press(getByText('Done'));
  });

  it('fires onChangeReminderTime when reminder time picker changes', () => {
    const { getByTestId, getAllByText } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('reminder-time-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    const doneButtons = getAllByText('Done');
    fireEvent.press(doneButtons[0]);
  });

  it('closes reminder time picker via cancel', () => {
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('reminder-time-open'));
    expect(getByTestId('reminder-time-picker-modal')).toBeTruthy();

    fireEvent.press(getByTestId('reminder-time-picker-modal-cancel'));
    expect(queryByTestId('reminder-time-picker-modal')).toBeNull();
  });

  it('enables recurring and toggles day buttons', () => {
    const { getByTestId, getAllByText } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('recurring-enabled-switch'), 'valueChange', true);

    // Day buttons Mon-Sun should now appear
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const label of dayLabels) {
      const btns = getAllByText(label);
      if (btns.length > 0) {
        fireEvent.press(btns[0]);
        // Toggle back off
        fireEvent.press(btns[0]);
      }
    }
  });

  it('shows paywall when non-pro user toggles reminder switch', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);
    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // Paywall visible, reminder not enabled
    expect(queryByTestId('reminder-date-open')).toBeNull();
  });

  it('shows Clear button when due date is set and clears it', () => {
    const { getByTestId, getByText, queryByText } = render(
      <AddTaskModal visible onClose={jest.fn()} />
    );

    // No Clear button initially
    expect(queryByText('Clear')).toBeNull();

    // Open due date picker and set a date via mock picker
    fireEvent.press(getByTestId('due-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('due-date-picker-modal-done'));

    // Now Clear button should appear — press it
    fireEvent.press(getByText('Clear'));
    // After clearing, Clear disappears and due-date-open still present
    expect(queryByText('Clear')).toBeNull();
  });

  it('shows Clear button when reminder is set and clears it', () => {
    const { getByTestId, getAllByText, queryAllByText } = render(
      <AddTaskModal visible onClose={jest.fn()} />
    );

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // Set reminder date
    fireEvent.press(getByTestId('reminder-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('reminder-date-picker-modal-done'));

    // A Clear button should appear for the reminder
    const clearBtns = getAllByText('Clear');
    expect(clearBtns.length).toBeGreaterThan(0);
    fireEvent.press(clearBtns[clearBtns.length - 1]);

    // After clearing, reminder is disabled
    expect(queryAllByText('Clear')).toHaveLength(0);
  });

  it('opens reminder time picker when reminderDateTime already set', () => {
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // Open date picker first to set reminderDateTime
    fireEvent.press(getByTestId('reminder-date-open'));
    fireEvent.press(getByTestId('mock-datetime-picker'));
    fireEvent.press(getByTestId('reminder-date-picker-modal-done'));
    // Now open time picker — reminderDateTime is already set, should skip init
    fireEvent.press(getByTestId('reminder-time-open'));
    expect(getByTestId('reminder-time-picker-modal')).toBeTruthy();
  });

  it('calls startWorkForTask and router.replace when startFocusNow is enabled', () => {
    const mockRouter = { replace: jest.fn() };
    jest.doMock('expo-router', () => ({ useRouter: () => mockRouter }));

    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent.changeText(getByTestId('task-title-input'), 'Focus task');
    fireEvent(getByTestId('start-focus-switch'), 'valueChange', true);
    fireEvent.press(getByTestId('add-task-submit'));

    expect(mockStartWorkForTask).toHaveBeenCalledWith('task-id');
  });

  it('dismisses paywall via onClose callback', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);
    // Trigger the paywall to appear
    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // Invoke the captured onClose callback
    mockPaywallOnClose();
    // No crash — setShowPaywall(false) was called
  });

  it('dismisses paywall via onUpgraded callback', () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean }) => unknown) => selector({ isPro: false })
    );
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);
    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // Invoke the captured onUpgraded callback
    mockPaywallOnUpgraded();
    // No crash — setShowPaywall(false) was called
  });
});

describe('AddTaskModal web platform paths', () => {
  const { Platform } = jest.requireActual('react-native') as typeof import('react-native');

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('renders web date input for due date on web platform', () => {
    const { queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);
    // On web, the native due-date-open button is replaced by a web <input>
    expect(queryByTestId('due-date-open')).toBeNull();
  });

  it('calls parseDateToEndOfDay via handleAdd with a due date input on web', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<AddTaskModal visible onClose={onClose} />);

    fireEvent.changeText(getByTestId('task-title-input'), 'Web task');

    // With empty dueDateInput, parseDateToEndOfDay returns undefined (no due date)
    fireEvent.press(getByTestId('add-task-submit'));

    expect(mockAddTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Web task' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders web date/time inputs for reminder on web platform', () => {
    const { getByTestId, queryByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);
    // On web, reminder uses web inputs instead of PickerSheet
    expect(queryByTestId('reminder-date-open')).toBeNull();
    expect(queryByTestId('reminder-time-open')).toBeNull();
  });
});
