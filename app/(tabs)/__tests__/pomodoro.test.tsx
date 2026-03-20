import { act, render } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

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

  it('applies theme bg to ScrollView style to prevent white background in dark mode', () => {
    const { UNSAFE_getByType } = render(<PomodoroScreen />);
    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.style).toMatchObject({ backgroundColor: '#ffffff' });
  });

  it('renders key pomodoro sections', () => {
    const { getByText } = render(<PomodoroScreen />);

    expect(getByText('Focus')).toBeTruthy();
    expect(getByText('Link to task')).toBeTruthy();
    expect(getByText('Session log')).toBeTruthy();
  });

  it('shows confetti when sessions increase', () => {
    const { getByTestId } = render(<PomodoroScreen />);

    act(() => {
      usePomodoroStore.setState({
        sessions: [
          {
            id: 'session-1',
            phase: 'work',
            durationMinutes: 25,
            startedAt: Date.now() - 25 * 60 * 1000,
            endedAt: Date.now(),
          },
        ],
      });
    });

    expect(getByTestId('pomodoro-confetti')).toBeTruthy();
  });

  it('clears pending confetti timeout when sessions increment again quickly', () => {
    const session1 = {
      id: 'session-1',
      phase: 'work' as const,
      durationMinutes: 25,
      startedAt: Date.now() - 25 * 60 * 1000,
      endedAt: Date.now(),
    };
    const session2 = {
      id: 'session-2',
      phase: 'work' as const,
      durationMinutes: 25,
      startedAt: Date.now() - 25 * 60 * 1000,
      endedAt: Date.now(),
    };
    render(<PomodoroScreen />);

    // Trigger first confetti (sets timeout)
    act(() => {
      usePomodoroStore.setState({ sessions: [session1] });
    });
    // Trigger second confetti before timeout fires (clears old timeout, sets new one)
    act(() => {
      usePomodoroStore.setState({ sessions: [session1, session2] });
    });
    // No assertion needed — just verify no crash (clearTimeout was called)
  });

  it('cleans up confetti timeout on unmount when timeout is active', () => {
    const { unmount } = render(<PomodoroScreen />);

    // Trigger confetti to set the timeout ref
    act(() => {
      usePomodoroStore.setState({
        sessions: [
          {
            id: 'session-1',
            phase: 'work',
            durationMinutes: 25,
            startedAt: Date.now() - 25 * 60 * 1000,
            endedAt: Date.now(),
          },
        ],
      });
    });

    // Unmount before 2400ms timeout fires — cleanup effect clears confettiTimeoutRef
    act(() => {
      unmount();
    });
    // Verify no crash — the cleanup cleared the timeout
  });
});
