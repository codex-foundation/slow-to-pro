import { fireEvent, render } from '@testing-library/react-native';

import TasksScreen from '../tasks';
import { useTaskStore } from '@/stores/taskStore';

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
  const { View, Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    TaskList: ({ tasks }: { tasks: Array<{ id: string; title: string }> }) =>
      React.createElement(
        View,
        { testID: 'mock-task-list' },
        tasks.map((task) => React.createElement(Text, { key: task.id }, task.title))
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

function resetTaskStore() {
  useTaskStore.setState({
    lastResetDate: new Date().toISOString().slice(0, 10),
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

  it('filters tasks by active and completed', () => {
    const { getByText, queryByText } = render(<TasksScreen />);

    // default: all
    expect(getByText('Read docs')).toBeTruthy();
    expect(getByText('Ship feature')).toBeTruthy();
    expect(getByText('Write tests')).toBeTruthy();

    fireEvent.press(getByText('active'));
    expect(getByText('Read docs')).toBeTruthy();
    expect(getByText('Write tests')).toBeTruthy();
    expect(queryByText('Ship feature')).toBeNull();

    fireEvent.press(getByText('completed'));
    expect(getByText('Ship feature')).toBeTruthy();
    expect(queryByText('Read docs')).toBeNull();
    expect(queryByText('Write tests')).toBeNull();
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
