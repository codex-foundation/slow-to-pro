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
  taskQueue: [],
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
      expect(state.status).toBe('running');     // break auto-starts
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

    it('auto-starts break (status running) after work cycle completes', () => {
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();
      expect(usePomodoroStore.getState().status).toBe('running');
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

    it('uses fallback startedAt when cycleStartedAt is null', () => {
      // completeCycle without cycleStartedAt set — hits the `??` fallback on line 125
      usePomodoroStore.setState({ ...INITIAL_STATE, cycleStartedAt: null });
      const before = Date.now();
      usePomodoroStore.getState().completeCycle();
      const session = usePomodoroStore.getState().sessions[0];
      expect(session).toBeDefined();
      expect(session.startedAt).toBeLessThanOrEqual(before);
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

    it('resets secondsRemaining to new break duration when in break phase', () => {
      usePomodoroStore.setState({ ...INITIAL_STATE, phase: 'break', secondsRemaining: 5 * 60 });
      usePomodoroStore.getState().updateDurations(30, 8);
      expect(usePomodoroStore.getState().secondsRemaining).toBe(8 * 60);
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
      expect(state.status).toBe('running'); // break auto-starts
      expect(state.phase).toBe('break');
      expect(state.sessions).toHaveLength(1);
      expect(scheduleTimerEndNotification).toHaveBeenCalledWith('work');
    });

    it('infers startedAt from secondsRemaining when cycleStartedAt is null', () => {
      // Covers lines 178-179: the `??` fallback in reconcileRunningTimer
      usePomodoroStore.setState({
        ...INITIAL_STATE,
        status: 'running',
        phase: 'work',
        secondsRemaining: 24 * 60, // 1 minute elapsed
        cycleStartedAt: null,
      });

      usePomodoroStore.getState().reconcileRunningTimer();

      const state = usePomodoroStore.getState();
      expect(state.status).toBe('running');
      expect(state.cycleStartedAt).not.toBeNull();
    });

    it('uses break duration when running in break phase', () => {
      // Covers line 177 false branch: phase === 'break'
      const now = Date.now();
      usePomodoroStore.setState({
        ...INITIAL_STATE,
        status: 'running',
        phase: 'break',
        secondsRemaining: 5 * 60,
        cycleStartedAt: now - 30 * 1000, // 30 seconds into break
      });

      usePomodoroStore.getState().reconcileRunningTimer();

      const state = usePomodoroStore.getState();
      expect(state.status).toBe('running');
      expect(state.secondsRemaining).toBeLessThan(5 * 60);
    });
  });

  describe('interval stops when status becomes non-running (line 25-26)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      usePomodoroStore.getState().reset();
    });

    it('stops the interval when status is set to non-running externally', () => {
      usePomodoroStore.getState().start();
      expect(usePomodoroStore.getState().status).toBe('running');

      // Directly mutate status to paused without calling stopPomodoroInterval
      usePomodoroStore.setState({ status: 'paused' });

      // Interval fires and detects non-running → stops itself
      jest.advanceTimersByTime(1000);

      // secondsRemaining should NOT have changed (interval stopped itself)
      expect(usePomodoroStore.getState().secondsRemaining).toBe(25 * 60);
    });
  });

  describe('completeCycle with a linked task that has a title', () => {
    it('records taskTitle from useTaskStore when selectedTaskId matches a task', () => {
      const taskId = 'task-with-title';
      useTaskStore.setState({
        tasks: [
          {
            id: taskId,
            title: 'My Important Task',
            completed: false,
            priority: 'high',
            order: 0,
            recurring: { enabled: false, days: [] },
            createdAt: Date.now(),
          },
        ],
        lastResetDate: new Date().toISOString().slice(0, 10),
      });

      usePomodoroStore.setState({ ...INITIAL_STATE, selectedTaskId: taskId });
      usePomodoroStore.getState().start();
      usePomodoroStore.getState().completeCycle();

      const session = usePomodoroStore.getState().sessions[0];
      expect(session.taskId).toBe(taskId);
      expect(session.taskTitle).toBe('My Important Task');
    });
  });

  describe('onRehydrateStorage null guard', () => {
    it('does not throw when rehydration state is null', () => {
      // Access Zustand persist API to invoke the rehydrate handler with null
      const store = usePomodoroStore as unknown as {
        persist: {
          onFinishHydration: (cb: () => void) => () => void;
          getOptions: () => { onRehydrateStorage?: () => (state: unknown) => void };
        };
      };
      const options = store.persist?.getOptions?.();
      const outerHandler = options?.onRehydrateStorage?.();
      expect(() => outerHandler?.(null)).not.toThrow();
    });
  });

  describe('auto-transition', () => {
    it('completeCycle: work phase → status running, phase break', () => {
      usePomodoroStore.setState({ phase: 'work', cycleStartedAt: Date.now() });
      usePomodoroStore.getState().completeCycle();
      const s = usePomodoroStore.getState();
      expect(s.phase).toBe('break');
      expect(s.status).toBe('running');
      expect(s.secondsRemaining).toBe(5 * 60);
      expect(s.cycleCount).toBe(1);
    });

    it('completeCycle: break phase with empty queue → status idle, phase work', () => {
      usePomodoroStore.setState({ phase: 'break', cycleStartedAt: Date.now(), taskQueue: [] });
      usePomodoroStore.getState().completeCycle();
      const s = usePomodoroStore.getState();
      expect(s.phase).toBe('work');
      expect(s.status).toBe('idle');
      expect(s.secondsRemaining).toBe(25 * 60);
    });

    it('completeCycle: break phase with queue → advances to next task, status running', () => {
      usePomodoroStore.setState({
        phase: 'break',
        cycleStartedAt: Date.now(),
        taskQueue: ['task-b', 'task-c'],
        selectedTaskId: 'task-a',
      });
      usePomodoroStore.getState().completeCycle();
      const s = usePomodoroStore.getState();
      expect(s.phase).toBe('work');
      expect(s.status).toBe('running');
      expect(s.selectedTaskId).toBe('task-b');
      expect(s.taskQueue).toEqual(['task-c']);
      expect(s.secondsRemaining).toBe(25 * 60);
    });

    it('completeCycle: break phase with single-item queue → queue empty after advance', () => {
      usePomodoroStore.setState({
        phase: 'break',
        cycleStartedAt: Date.now(),
        taskQueue: ['task-b'],
        selectedTaskId: 'task-a',
      });
      usePomodoroStore.getState().completeCycle();
      const s = usePomodoroStore.getState();
      expect(s.selectedTaskId).toBe('task-b');
      expect(s.taskQueue).toEqual([]);
      expect(s.status).toBe('running');
    });
  });

  describe('task queue', () => {
    it('setTaskQueue replaces the queue', () => {
      usePomodoroStore.getState().setTaskQueue(['t1', 't2']);
      expect(usePomodoroStore.getState().taskQueue).toEqual(['t1', 't2']);
    });

    it('startQueue sets selectedTaskId to first, taskQueue to rest, and starts timer', () => {
      usePomodoroStore.getState().startQueue(['t1', 't2', 't3']);
      const s = usePomodoroStore.getState();
      expect(s.selectedTaskId).toBe('t1');
      expect(s.taskQueue).toEqual(['t2', 't3']);
      expect(s.status).toBe('running');
      expect(s.phase).toBe('work');
      expect(s.secondsRemaining).toBe(25 * 60);
    });

    it('startQueue does nothing when given empty array', () => {
      usePomodoroStore.getState().startQueue([]);
      expect(usePomodoroStore.getState().status).toBe('idle');
    });
  });
});
