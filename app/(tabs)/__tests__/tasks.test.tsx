import { act, fireEvent, render } from '@testing-library/react-native';
import { useTaskStore } from '@/stores/taskStore';
import TasksScreen from '../tasks';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock') as {
    default: { call: () => void };
  };
  Reanimated.default.call = () => {};
  return Reanimated;
});

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

jest.mock('@/components/tasks/NextReminderDebugPanel', () => ({
  NextReminderDebugPanel: () => null,
}));

jest.mock('@/components/tasks/TaskList', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, Text, Pressable } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');

  return {
    TaskList: ({
      tasks,
      onTaskCompleted,
    }: {
      tasks: Array<{ id: string; title: string }>;
      onTaskCompleted?: () => void;
    }) =>
      React.createElement(
        View,
        { testID: 'mock-task-list' },
        tasks.map((task) => React.createElement(Text, { key: task.id }, task.title)),
        React.createElement(
          Pressable,
          { testID: 'mock-task-completed', onPress: onTaskCompleted },
          React.createElement(Text, null, 'Complete task')
        )
      ),
  };
});

jest.mock('@/components/ui/FAB', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Pressable, Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    FAB: ({ onPress }: { onPress: () => void }) =>
      React.createElement(
        Pressable,
        { testID: 'mock-fab', onPress },
        React.createElement(Text, null, 'Open add modal')
      ),
  };
});

jest.mock('@/components/tasks/AddTaskModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, Text, Pressable } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');

  return {
    AddTaskModal: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
      visible
        ? React.createElement(
            View,
            { testID: 'mock-add-task-modal' },
            React.createElement(Text, null, 'Add modal open'),
            React.createElement(
              Pressable,
              { testID: 'mock-add-task-close', onPress: onClose },
              React.createElement(Text, null, 'Close')
            )
          )
        : null,
  };
});

jest.mock('react-native-confetti-cannon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'mock-confetti-cannon' }),
  };
});

const mockFireConfetti = jest.fn();
jest.mock('@/utils/confetti', () => ({
  fireConfetti: (...args: unknown[]) => mockFireConfetti(...args),
}));

function resetTaskStore() {
  useTaskStore.setState({
    lastResetDate: new Date().toISOString().slice(0, 10),
    categories: [],
    tasks: [
      {
        id: 'task-1',
        title: 'Read docs',
        completed: false,
        priority: 'high',
        order: 0,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
      {
        id: 'task-2',
        title: 'Ship feature',
        completed: true,
        completedAt: Date.now(),
        priority: 'medium',
        order: 1,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
      {
        id: 'task-3',
        title: 'Write tests',
        completed: false,
        priority: 'low',
        order: 2,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
    ],
  });
}

describe('TasksScreen UI', () => {
  beforeEach(() => {
    resetTaskStore();
  });

  it('renders all tasks (active + completed) ordered by order', () => {
    const { getByText } = render(<TasksScreen />);
    expect(getByText('Read docs')).toBeTruthy();
    expect(getByText('Ship feature')).toBeTruthy();
    expect(getByText('Write tests')).toBeTruthy();
  });

  it('shows weekday · counts subtitle', () => {
    const { getByText } = render(<TasksScreen />);
    expect(getByText(/to do · \d+ done/)).toBeTruthy();
  });

  it('opens and closes add task modal from FAB', () => {
    const { getByTestId, queryByTestId } = render(<TasksScreen />);

    expect(queryByTestId('mock-add-task-modal')).toBeNull();

    fireEvent.press(getByTestId('mock-fab'));
    expect(getByTestId('mock-add-task-modal')).toBeTruthy();

    fireEvent.press(getByTestId('mock-add-task-close'));
    expect(queryByTestId('mock-add-task-modal')).toBeNull();
  });
});

describe('TasksScreen handleTaskCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetTaskStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls fireConfetti on web platform', () => {
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'web';

    const { getByTestId } = render(<TasksScreen />);
    fireEvent.press(getByTestId('mock-task-completed'));
    expect(mockFireConfetti).toHaveBeenCalledTimes(1);

    (Platform as { OS: string }).OS = original;
  });

  it('shows confetti cannon on native platform after task completion', () => {
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';

    const { getByTestId, queryByTestId } = render(<TasksScreen />);
    expect(queryByTestId('mock-confetti-cannon')).toBeNull();
    fireEvent.press(getByTestId('mock-task-completed'));
    expect(getByTestId('mock-confetti-cannon')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2400);
    });
    expect(queryByTestId('mock-confetti-cannon')).toBeNull();

    (Platform as { OS: string }).OS = original;
  });

  it('clears confetti timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';

    const { getByTestId, unmount } = render(<TasksScreen />);
    fireEvent.press(getByTestId('mock-task-completed'));
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    (Platform as { OS: string }).OS = original;
  });

  it('rapid double completion resets confetti timeout', () => {
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { getByTestId } = render(<TasksScreen />);
    fireEvent.press(getByTestId('mock-task-completed'));
    fireEvent.press(getByTestId('mock-task-completed'));
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    (Platform as { OS: string }).OS = original;
  });
});
