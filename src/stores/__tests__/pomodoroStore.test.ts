import { usePomodoroStore } from '../../stores/pomodoroStore';
import { useTaskStore } from '../../stores/taskStore';
import { scheduleTimerEndNotification } from '../../utils/notifications';

jest.mock('../../utils/notifications', () => ({
  scheduleTimerEndNotification: jest.fn(),
  scheduleOverBudgetNotification: jest.fn(),
}));

const INITIAL_STATE = {
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

beforeEach(() => {
  usePomodoroStore.setState(INITIAL_STATE);
  useTaskStore.setState({ tasks: [], lastResetDate: new Date().toISOString().slice(0, 10) });
  jest.clearAllMocks();
});

describe('pomodoroStore', () => {
  describe('global timer runtime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      usePomodoroStore.getState().reset();
    });

    it('keeps ticking while running and completes at zero with notification', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.setState({ secondsRemaining: 2 });

      jest.advanceTimersByTime(1000);
      expect(usePomodoroStore.getState().secondsRemaining).toBe(1);
      expect(usePomodoroStore.getState().status).toBe('running');

      jest.advanceTimersByTime(1000);
      const state = usePomodoroStore.getState();
      expect(state.status).toBe('idle');
      expect(state.phase).toBe('break');
      expect(state.secondsRemaining).toBe(state.breakDuration * 60);
      expect(state.sessions).toHaveLength(1);
      expect(scheduleTimerEndNotification).toHaveBeenCalledWith('work');
    });
  });

  describe('start', () => {
    it('sets status to running', () => {
      usePomodoroStore.getState().start();
      expect(usePomodoroStore.getState().status).toBe('running');
    });

    it('sets secondsRemaining to workDuration * 60 when idle', () => {
      usePomodoroStore.getState().start();
      expect(usePomodoroStore.getState().secondsRemaining).toBe(25 * 60);
    });

    it('sets cycleStartedAt when starting from idle', () => {
      const before = Date.now();
      usePomodoroStore.getState().start();
      const after = Date.now();
      const { cycleStartedAt } = usePomodoroStore.getState();
      expect(cycleStartedAt).toBeGreaterThanOrEqual(before);
      expect(cycleStartedAt).toBeLessThanOrEqual(after);
    });

    it('reconstructs cycleStartedAt when resuming from paused', () => {
      const now = Date.now();
      usePomodoroStore.setState({
        ...INITIAL_STATE,
        status: 'paused',
        phase: 'work',
        secondsRemaining: 24 * 60,
        cycleStartedAt: null,
      });

      usePomodoroStore.getState().start();

      const startedAt = usePomodoroStore.getState().cycleStartedAt;
      expect(startedAt).not.toBeNull();
      expect(Math.abs((startedAt ?? now) - (now - 60 * 1000))).toBeLessThanOrEqual(1000);
    });
  });

  describe('pause', () => {
    it('sets status to paused', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().pause();
      expect(usePomodoroStore.getState().status).toBe('paused');
    });

    it('clears cycleStartedAt when paused', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().pause();
      expect(usePomodoroStore.getState().cycleStartedAt).toBeNull();
    });
  });

  describe('reset', () => {
    it('sets status to idle', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().reset();
      expect(usePomodoroStore.getState().status).toBe('idle');
    });

    it('resets secondsRemaining to workDuration * 60', () => {
      usePomodoroStore.setState({ secondsRemaining: 100 });
      usePomodoroStore.getState().reset();
      expect(usePomodoroStore.getState().secondsRemaining).toBe(25 * 60);
    });

    it('clears cycleStartedAt', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().reset();
      expect(usePomodoroStore.getState().cycleStartedAt).toBeNull();
    });
  });

  describe('tick', () => {
    it('decrements secondsRemaining by 1', () => {
      usePomodoroStore.getState().start();
      const before = usePomodoroStore.getState().secondsRemaining;
      usePomodoroStore.getState().tick();
      expect(usePomodoroStore.getState().secondsRemaining).toBe(before - 1);
    });
  });

  describe('completeCycle', () => {
    it('flips phase from work to break', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      expect(usePomodoroStore.getState().phase).toBe('break');
    });

    it('flips phase from break to work', () => {
      usePomodoroStore.setState({ ...INITIAL_STATE, phase: 'break', secondsRemaining: 5 * 60 });
      usePomodoroStore.getState().completeCycle();
      expect(usePomodoroStore.getState().phase).toBe('work');
    });

    it('resets status to idle', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      expect(usePomodoroStore.getState().status).toBe('idle');
    });

    it('logs a session', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      const { sessions } = usePomodoroStore.getState();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].phase).toBe('work');
      expect(sessions[0].durationMinutes).toBe(25);
    });

    it('increments cycleCount only for work cycles', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle(); // work → break
      expect(usePomodoroStore.getState().cycleCount).toBe(1);

      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle(); // break → work
      expect(usePomodoroStore.getState().cycleCount).toBe(1); // unchanged
    });

    it('fires a timer-end notification', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      expect(scheduleTimerEndNotification).toHaveBeenCalledWith('work');
    });

    it('links the active task in the session', () => {
      usePomodoroStore.setState({ ...INITIAL_STATE, selectedTaskId: 'task-abc' });
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      expect(usePomodoroStore.getState().sessions[0].taskId).toBe('task-abc');
    });

    it('caps session log at 50 entries', () => {
      const manySessions = Array.from({ length: 50 }, (_, i) => ({
        id: `s-${i}`,
        phase: 'work' as const,
        durationMinutes: 25,
        startedAt: Date.now(),
        endedAt: Date.now(),
      }));
      usePomodoroStore.setState({ ...INITIAL_STATE, sessions: manySessions });

      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();

      expect(usePomodoroStore.getState().sessions).toHaveLength(50);
    });
  });

  describe('setSelectedTask', () => {
    it('sets selectedTaskId', () => {
      usePomodoroStore.getState().setSelectedTask('task-123');
      expect(usePomodoroStore.getState().selectedTaskId).toBe('task-123');
    });

    it('accepts null to clear selection', () => {
      usePomodoroStore.getState().setSelectedTask('task-123');
      usePomodoroStore.getState().setSelectedTask(null);
      expect(usePomodoroStore.getState().selectedTaskId).toBeNull();
    });
  });

  describe('startWorkForTask', () => {
    it('starts a work session linked to task id', () => {
      usePomodoroStore.getState().startWorkForTask('task-xyz');
      const state = usePomodoroStore.getState();

      expect(state.selectedTaskId).toBe('task-xyz');
      expect(state.phase).toBe('work');
      expect(state.status).toBe('running');
      expect(state.secondsRemaining).toBe(state.workDuration * 60);
      expect(state.cycleStartedAt).toBeDefined();
    });

    it('can start work session without task link', () => {
      usePomodoroStore.getState().startWorkForTask(null);
      const state = usePomodoroStore.getState();

      expect(state.selectedTaskId).toBeNull();
      expect(state.status).toBe('running');
      expect(state.phase).toBe('work');
    });

    it('supports create-then-focus flow with a new task id', () => {
      const newTaskId = useTaskStore.getState().addTask({
        title: 'New focus task',
        priority: 'high',
        recurring: { enabled: false, days: [] },
      });

      usePomodoroStore.getState().startWorkForTask(newTaskId);

      const state = usePomodoroStore.getState();
      expect(state.selectedTaskId).toBe(newTaskId);
      expect(state.status).toBe('running');
      expect(state.phase).toBe('work');
    });
  });

  describe('updateDurations', () => {
    it('updates work and break durations', () => {
      usePomodoroStore.getState().updateDurations(50, 10);
      const { workDuration, breakDuration } = usePomodoroStore.getState();
      expect(workDuration).toBe(50);
      expect(breakDuration).toBe(10);
    });

    it('resets secondsRemaining to new work duration when in work phase', () => {
      usePomodoroStore.getState().updateDurations(50, 10);
      expect(usePomodoroStore.getState().secondsRemaining).toBe(50 * 60);
    });

    it('resets status to idle', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().updateDurations(50, 10);
      expect(usePomodoroStore.getState().status).toBe('idle');
    });
  });

  describe('reconcileRunningTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      usePomodoroStore.getState().reset();
    });

    it('updates secondsRemaining based on wall-clock elapsed time', () => {
      const now = Date.now();
      usePomodoroStore.setState({
        ...INITIAL_STATE,
        status: 'running',
        phase: 'work',
        secondsRemaining: 25 * 60,
        cycleStartedAt: now - 10 * 1000,
      });

      usePomodoroStore.getState().reconcileRunningTimer();

      expect(usePomodoroStore.getState().secondsRemaining).toBe(25 * 60 - 10);
      expect(usePomodoroStore.getState().status).toBe('running');
    });

    it('completes the cycle if elapsed time passed the timer while app was away', () => {
      const now = Date.now();
      usePomodoroStore.setState({
        ...INITIAL_STATE,
        status: 'running',
        phase: 'work',
        secondsRemaining: 25 * 60,
        cycleStartedAt: now - 26 * 60 * 1000,
      });

      usePomodoroStore.getState().reconcileRunningTimer();

      const state = usePomodoroStore.getState();
      expect(state.status).toBe('idle');
      expect(state.phase).toBe('break');
      expect(state.sessions).toHaveLength(1);
      expect(scheduleTimerEndNotification).toHaveBeenCalledWith('work');
    });
  });
});
