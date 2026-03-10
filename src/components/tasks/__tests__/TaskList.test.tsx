import { fireEvent, render } from '@testing-library/react-native';

import { useTaskStore } from '@/stores/taskStore';
import { TaskList } from '../TaskList';

jest.mock('react-native-reanimated', () => {
  const { FlatList } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: {
      FlatList,
    },
    Layout: {
      springify: jest.fn(() => ({ name: 'mock-spring-layout-transition' })),
    },
  };
});

jest.mock('react-native-draggable-flatlist', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { FlatList } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    default: ({ data, keyExtractor, renderItem, contentContainerStyle }: any) =>
      React.createElement(FlatList, {
        data,
        keyExtractor,
        renderItem,
        contentContainerStyle,
      }),
  };
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

jest.mock('../TaskItem', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Pressable, Text, View } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');

  return {
    TaskItem: ({
      item,
      onMoveUp,
      onMoveDown,
      onCompleted,
    }: {
      item: { id: string; title: string };
      onMoveUp?: () => void;
      onMoveDown?: () => void;
      onCompleted?: () => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, item.title),
        React.createElement(
          Pressable,
          { testID: `move-up-${item.id}`, onPress: onMoveUp, disabled: !onMoveUp },
          React.createElement(Text, null, 'up')
        ),
        React.createElement(
          Pressable,
          { testID: `move-down-${item.id}`, onPress: onMoveDown, disabled: !onMoveDown },
          React.createElement(Text, null, 'down')
        ),
        React.createElement(
          Pressable,
          { testID: `complete-${item.id}`, onPress: onCompleted, disabled: !onCompleted },
          React.createElement(Text, null, 'complete')
        )
      ),
  };
});

function seedTaskStore() {
  useTaskStore.setState({
    lastResetDate: new Date().toISOString().slice(0, 10),
    tasks: [
      {
        id: 't1',
        title: 'First',
        completed: false,
        priority: 'low',
        order: 0,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
      {
        id: 't2',
        title: 'Second',
        completed: false,
        priority: 'low',
        order: 1,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
      {
        id: 't3',
        title: 'Third',
        completed: false,
        priority: 'low',
        order: 2,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
    ],
  });
}

describe('TaskList ordering controls', () => {
  beforeEach(() => {
    seedTaskStore();
  });

  it('enables iOS item layout animation on non-android list path', () => {
    const reanimated = jest.requireMock('react-native-reanimated') as {
      Layout: { springify: jest.Mock };
    };
    const tasks = [...useTaskStore.getState().tasks].sort((a, b) => a.order - b.order);

    render(<TaskList tasks={tasks} />);

    expect(reanimated.Layout.springify).toHaveBeenCalledTimes(1);
  });

  it('reorders tasks when move down is pressed (iOS/web path)', () => {
    const tasks = [...useTaskStore.getState().tasks].sort((a, b) => a.order - b.order);
    const { getByTestId } = render(<TaskList tasks={tasks} />);

    fireEvent.press(getByTestId('move-down-t1'));

    const orderedTitles = [...useTaskStore.getState().tasks]
      .sort((a, b) => a.order - b.order)
      .map((t) => t.title);

    expect(orderedTitles).toEqual(['Second', 'First', 'Third']);
  });

  it('calls completion callback when a task completion action happens', () => {
    const tasks = [...useTaskStore.getState().tasks].sort((a, b) => a.order - b.order);
    const onTaskCompleted = jest.fn();
    const { getByTestId } = render(<TaskList tasks={tasks} onTaskCompleted={onTaskCompleted} />);

    fireEvent.press(getByTestId('complete-t1'));

    expect(onTaskCompleted).toHaveBeenCalledTimes(1);
  });
});
