import { act, render } from '@testing-library/react-native';

import PomodoroScreen from '../pomodoro';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

jest.mock('@/utils/notifications', () => ({
  scheduleTaskReminderNotification: jest.fn(),
  scheduleTimerEndNotification: jest.fn(),
  scheduleOverBudgetNotification: jest.fn(),
}));

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

jest.mock('react-native-confetti-cannon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return React.forwardRef(() => React.createElement(View, { testID: 'pomodoro-confetti' }));
});

jest.mock('@/utils/confetti', () => ({
  fireConfetti: jest.fn(),
}));

jest.mock('@/components/pomodoro/TimerDisplay', () => ({
  TimerDisplay: () => null,
}));

jest.mock('@/components/pomodoro/TimerControls', () => ({
  TimerControls: () => null,
}));

jest.mock('@/components/pomodoro/TaskPicker', () => ({
  TaskPicker: () => null,
}));

jest.mock('@/components/pomodoro/SessionLog', () => ({
  SessionLog: () => null,
}));

const INITIAL_POMODORO_STATE = {
  sessions: [],
  workDuration: 25,
  breakDuration: 5,
  status: 'idle' as const,
  phase: 'work' as const,
  secondsRemaining: 25 * 60,
  cycleCount: 0,
  selectedTaskId: null,
  cycleStartedAt: null,
};

describe('PomodoroScreen UI', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    usePomodoroStore.setState(INITIAL_POMODORO_STATE);
    useTaskStore.setState({
      tasks: [],
      lastResetDate: new Date().toISOString().slice(0, 10),
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders key pomodoro sections', () => {
    const { getByText } = render(<PomodoroScreen />);

    expect(getByText('Focus')).toBeTruthy();
    expect(getByText('Link to task')).toBeTruthy();
    expect(getByText('Session log')).toBeTruthy();
  });

  it('ticks while running and completes cycle at zero', () => {
    usePomodoroStore.setState({
      status: 'running',
      phase: 'work',
      secondsRemaining: 2,
      cycleStartedAt: Date.now(),
    });

    const { getByTestId } = render(<PomodoroScreen />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(usePomodoroStore.getState().secondsRemaining).toBe(1);
    expect(usePomodoroStore.getState().status).toBe('running');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const state = usePomodoroStore.getState();
    expect(state.status).toBe('idle');
    expect(state.phase).toBe('break');
    expect(state.secondsRemaining).toBe(state.breakDuration * 60);
    expect(state.sessions.length).toBe(1);
    expect(getByTestId('pomodoro-confetti')).toBeTruthy();
  });
});
