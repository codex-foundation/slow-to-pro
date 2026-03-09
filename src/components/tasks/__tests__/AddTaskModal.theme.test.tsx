import { fireEvent, render } from '@testing-library/react-native';

const mockDateTimePicker = jest.fn();

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
    default: (props: unknown) => {
      mockDateTimePicker(props);
      return React.createElement(View, { testID: 'mock-datetime-picker' });
    },
  };
});

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: true,
    bg: '#020617',
    surface: '#0f172a',
    surfaceElevated: '#1e293b',
    surfaceMuted: '#334155',
    border: '#475569',
    text: '#f8fafc',
    textMuted: '#cbd5e1',
    textSubtle: '#94a3b8',
    primary: '#6366f1',
    primarySoft: '#312e81',
    danger: '#ef4444',
    success: '#10b981',
    overlay: 'rgba(2, 6, 23, 0.6)',
  }),
}));

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

import { AddTaskModal } from '../AddTaskModal';

describe('AddTaskModal dark theme input', () => {
  it('uses theme colors for task title input text and placeholder', () => {
    mockDateTimePicker.mockClear();
    const { getByTestId } = render(<AddTaskModal visible onClose={jest.fn()} />);

    const input = getByTestId('task-title-input');
    expect(input.props.placeholderTextColor).toBe('#94a3b8');
    expect(input.props.style).toEqual(
      expect.objectContaining({
        color: '#f8fafc',
        backgroundColor: '#0f172a',
        borderColor: '#475569',
      })
    );

    const dueDateButton = getByTestId('due-date-open');
    expect(dueDateButton.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#0f172a',
        borderColor: '#475569',
      })
    );

    fireEvent(getByTestId('reminder-enabled-switch'), 'valueChange', true);

    const reminderDateButton = getByTestId('reminder-date-open');
    expect(reminderDateButton.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#0f172a',
        borderColor: '#475569',
      })
    );

    const reminderTimeButton = getByTestId('reminder-time-open');
    expect(reminderTimeButton.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#0f172a',
        borderColor: '#475569',
      })
    );

    fireEvent.press(getByTestId('due-date-open'));

    expect(mockDateTimePicker).toHaveBeenCalled();
    const lastCallArgs = mockDateTimePicker.mock.calls.at(-1)?.[0] as {
      themeVariant?: string;
      textColor?: string;
    };
    expect(lastCallArgs?.themeVariant).toBe('dark');
    expect(lastCallArgs?.textColor).toBe('#f8fafc');
  });
});
