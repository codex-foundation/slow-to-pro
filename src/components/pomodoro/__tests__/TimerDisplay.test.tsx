import { render } from '@testing-library/react-native';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    success: '#34C759',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
  }),
}));

let mockPomodoroState = {
  secondsRemaining: 25 * 60,
  phase: 'work' as 'work' | 'break',
  cycleCount: 0,
  selectedTaskId: null as string | null,
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
    };
    mockTasks = [{ id: 'task-1', title: 'Write tests', completed: false }];
  });

  it('shows Focus label during work phase', () => {
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Focus')).toBeTruthy();
  });

  it('shows Break label during break phase', () => {
    mockPomodoroState = { ...mockPomodoroState, phase: 'break' };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('Break')).toBeTruthy();
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

  it('shows session count when cycleCount > 0', () => {
    mockPomodoroState = { ...mockPomodoroState, cycleCount: 3 };
    const { getByText } = render(<TimerDisplay />);
    expect(getByText('3 sessions completed today')).toBeTruthy();
  });
});
