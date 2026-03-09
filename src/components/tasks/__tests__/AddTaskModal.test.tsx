import { fireEvent, render } from '@testing-library/react-native';

import { AddTaskModal } from '../AddTaskModal';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'mock-datetime-picker' }),
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
  useTaskStore: (selector: (s: { addTask: typeof mockAddTask }) => unknown) =>
    selector({ addTask: mockAddTask }),
}));

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: { startWorkForTask: typeof mockStartWorkForTask }) => unknown) =>
    selector({ startWorkForTask: mockStartWorkForTask }),
}));

describe('AddTaskModal date/reminder picker modals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
