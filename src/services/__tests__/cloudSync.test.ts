import { applySnapshot, getLocalSnapshot } from '../cloudSync';
import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTaskStore } from '@/stores/taskStore';

const now = new Date('2026-03-11T12:00:00.000Z').getTime();

beforeEach(() => {
  useTaskStore.setState({
    tasks: [],
    lastResetDate: '2026-03-11',
  });

  useFinanceStore.setState({
    categories: [{ id: 'cat-food', name: 'Food', color: '#f97316' }],
    budgets: [],
    expenses: [],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly',
  });

  usePomodoroStore.setState({
    sessions: [],
    workDuration: 25,
    breakDuration: 5,
    status: 'idle',
    phase: 'work',
    secondsRemaining: 25 * 60,
    cycleCount: 0,
    selectedTaskId: null,
    cycleStartedAt: null,
  });

  useSettingsStore.setState({
    themePreference: 'system',
  });
});

describe('cloudSync snapshot helpers', () => {
  it('creates a snapshot from local stores', () => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Read chapter',
          completed: false,
          priority: 'medium',
          order: 0,
          recurring: { enabled: false, days: [] },
          createdAt: now,
        },
      ],
      lastResetDate: '2026-03-10',
    });

    useSettingsStore.setState({ themePreference: 'dark' });

    const snapshot = getLocalSnapshot();

    expect(snapshot.taskStore.tasks).toHaveLength(1);
    expect(snapshot.taskStore.lastResetDate).toBe('2026-03-10');
    expect(snapshot.settingsStore.themePreference).toBe('dark');
    expect(typeof snapshot.updatedAt).toBe('string');
  });

  it('applies a snapshot back into local stores', () => {
    const snapshot = {
      taskStore: {
        tasks: [
          {
            id: 'task-remote',
            title: 'Remote task',
            completed: true,
            completedAt: now,
            priority: 'high' as const,
            order: 0,
            recurring: { enabled: false, days: [] },
            createdAt: now,
          },
        ],
        lastResetDate: '2026-03-01',
      },
      financeStore: {
        categories: [{ id: 'cat-remote', name: 'Remote', color: '#3b82f6' }],
        budgets: [],
        expenses: [],
        notifiedBudgetThresholdByKey: {},
        overallBudgetAmount: 500,
        overallBudgetPeriod: 'monthly' as const,
      },
      pomodoroStore: {
        sessions: [],
        workDuration: 30,
        breakDuration: 10,
        status: 'idle' as const,
        phase: 'work' as const,
        secondsRemaining: 30 * 60,
        cycleCount: 2,
        selectedTaskId: 'task-remote',
        cycleStartedAt: null,
      },
      settingsStore: {
        themePreference: 'light' as const,
      },
      updatedAt: new Date().toISOString(),
    };

    applySnapshot(snapshot);

    expect(useTaskStore.getState().tasks[0].id).toBe('task-remote');
    expect(useFinanceStore.getState().overallBudgetAmount).toBe(500);
    expect(usePomodoroStore.getState().workDuration).toBe(30);
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });
});
