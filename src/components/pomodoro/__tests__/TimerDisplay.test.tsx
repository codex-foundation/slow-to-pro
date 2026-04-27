import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    primary: '#007AFF',
    success: '#34C759',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
  }),
}));

jest.mock('react-native-svg', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub,
  };
});

let mockPomodoroState = {
  secondsRemaining: 25 * 60,
  phase: 'work' as 'work' | 'break',
  cycleCount: 0,
  selectedTaskId: null as string | null,
  workDuration: 25,
  breakDuration: 5,
};

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: (selector: (s: typeof mockPomodoroState) => unknown) =>
    selector(mockPomodoroState),
}));

let mockTasks = [{ id: 'task-1', title: 'Write tests', completed: false }];

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: (selector: (s: { tasks: typeof mockTasks }) => unknown) =>
    selector({ tasks: mockTasks }),
}));

import { TimerDisplay } from '../TimerDisplay';

describe('TimerDisplay', () => {
  beforeEach(() => {
    mockPomodoroState = {
      secondsRemaining: 25 * 60,
      phase: 'work',
      cycleCount: 0,
      selectedTaskId: null,
      workDuration: 25,
      breakDuration: 5,
    };
    mockTasks = [{ id: 'task-1', title: 'Write tests', completed: false }];
  });

  it('shows FOCUS label during work phase', () => {
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('FOCUS')).toBeTruthy();
  });

  it('shows BREAK label during break phase', () => {
    mockPomodoroState = { ...mockPomodoroState, phase: 'break' };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('BREAK')).toBeTruthy();
  });

  it('shows the running task name when selectedTaskId is set and phase is work', () => {
    mockPomodoroState = { ...mockPomodoroState, selectedTaskId: 'task-1' };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Write tests')).toBeTruthy();
  });

  it('does not show task name during break phase even if selectedTaskId is set', () => {
    mockPomodoroState = { ...mockPomodoroState, phase: 'break', selectedTaskId: 'task-1' };
    const { queryByText } = render(<TimerDisplay />);
    expect(queryByText('Write tests')).toBeNull();
  });

  it('does not show task name when no task is selected', () => {
    mockPomodoroState = { ...mockPomodoroState, selectedTaskId: null };
    const { queryByText } = render(<TimerDisplay />);
    expect(queryByText('Write tests')).toBeNull();
  });

  it('renders the countdown formatted as mm:ss', () => {
    mockPomodoroState = { ...mockPomodoroState, secondsRemaining: 125 };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('02:05')).toBeTruthy();
  });
});
