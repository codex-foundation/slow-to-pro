import { fireEvent, render } from '@testing-library/react-native';

import { TaskItem } from '../TaskItem';

const mockToggleTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockUpdateTask = jest.fn();

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

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: () => ({
    toggleTask: mockToggleTask,
    deleteTask: mockDeleteTask,
    updateTask: mockUpdateTask,
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

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows recurring indicator in metadata and exposes swipe actions', () => {
    const recurringTask = {
      ...baseTask,
      recurring: { enabled: true, days: [1, 3, 5] },
    };

    const { getByText, getByTestId } = render(<TaskItem item={recurringTask} />);

    expect(getByText('Recurring')).toBeTruthy();
    expect(getByTestId('delete-task-swipe')).toBeTruthy();
  });
});
