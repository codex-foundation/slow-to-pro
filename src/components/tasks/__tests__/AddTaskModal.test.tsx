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
});
