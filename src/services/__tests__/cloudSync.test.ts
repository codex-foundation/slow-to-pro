import {
  applySnapshot,
  getLocalSnapshot,
  pullCloudSnapshot,
  pushCloudSnapshot,
  syncFromCloudOrSeed,
  pullForCurrentUser,
  pushForCurrentUser,
} from '../cloudSync';
import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSyncStore } from '@/stores/syncStore';
import { useTaskStore } from '@/stores/taskStore';

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: jest.fn().mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }),
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      },
    })),
  },
  CLOUD_SYNC_TABLE: 'cloud_sync',
}));

const now = new Date('2026-03-11T12:00:00.000Z').getTime();

beforeEach(() => {
  useTaskStore.setState({
    tasks: [],
    categories: [],
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
      categories: [{ id: 'tc-1', name: 'Work', color: '#6366f1' }],
      lastResetDate: '2026-03-10',
    });

    useSettingsStore.setState({ themePreference: 'dark' });

    const snapshot = getLocalSnapshot();

    expect(snapshot.taskStore.tasks).toHaveLength(1);
    expect(snapshot.taskStore.categories).toHaveLength(1);
    expect(snapshot.taskStore.categories[0].name).toBe('Work');
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
        categories: [{ id: 'tc-remote', name: 'Remote Work', color: '#6366f1' }],
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
    expect(useTaskStore.getState().categories[0].id).toBe('tc-remote');
    expect(useFinanceStore.getState().overallBudgetAmount).toBe(500);
    expect(usePomodoroStore.getState().workDuration).toBe(30);
    expect(useSettingsStore.getState().themePreference).toBe('light');
  });
});

// ---------------------------------------------------------------------------
describe('pullCloudSnapshot', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
  });

  it('returns null when no cloud data exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await pullCloudSnapshot('user-1');
    expect(result).toBeNull();
  });

  it('returns the snapshot when cloud data exists', async () => {
    const snap = { taskStore: {}, financeStore: {}, updatedAt: new Date().toISOString() };
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await pullCloudSnapshot('user-1');
    expect(result).toEqual(snap);
  });

  it('throws when supabase query returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });
    await expect(pullCloudSnapshot('user-1')).rejects.toMatchObject({ message: 'db error' });
  });
});

// ---------------------------------------------------------------------------
describe('pushCloudSnapshot', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
  });

  it('upserts the snapshot to supabase', async () => {
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue({
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      },
    });
    await pushCloudSnapshot('user-1');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1' }),
      { onConflict: 'user_id' }
    );
  });

  it('throws when upsert returns an error', async () => {
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue({
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: { message: 'upsert failed' } }).then(r) };
      },
    });
    await expect(pushCloudSnapshot('user-1')).rejects.toMatchObject({ message: 'upsert failed' });
  });
});

// ---------------------------------------------------------------------------
describe('syncFromCloudOrSeed', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }),
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      },
    }));
  });

  it('returns pulled when remote snapshot exists', async () => {
    const snap = {
      taskStore: { tasks: [], categories: [], lastResetDate: '2026-01-01' },
      financeStore: { categories: [], budgets: [], expenses: [], notifiedBudgetThresholdByKey: {}, overallBudgetAmount: 0, overallBudgetPeriod: 'monthly' as const },
      pomodoroStore: { sessions: [], workDuration: 25, breakDuration: 5, status: 'idle' as const, phase: 'work' as const, secondsRemaining: 1500, cycleCount: 0, selectedTaskId: null, cycleStartedAt: null },
      settingsStore: { themePreference: 'system' as const },
      updatedAt: new Date().toISOString(),
    };
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await syncFromCloudOrSeed('user-1');
    expect(result).toBe('pulled');
  });

  it('returns seeded when no remote snapshot', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await syncFromCloudOrSeed('user-1');
    expect(result).toBe('seeded');
  });
});

// ---------------------------------------------------------------------------
describe('pullForCurrentUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockMaybeSingle.mockReset();
    useSyncStore.setState({ isSyncing: false, lastSyncedAt: null, syncError: null });
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }),
    }));
  });

  it('returns false when getUser fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
  });

  it('returns false when getUser returns error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'auth error' } });
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
  });

  it('returns false and sets error when no snapshot found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('No cloud data found');
  });

  it('applies snapshot and returns true on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const snap = {
      taskStore: { tasks: [], categories: [], lastResetDate: '2026-01-01' },
      financeStore: { categories: [], budgets: [], expenses: [], notifiedBudgetThresholdByKey: {}, overallBudgetAmount: 0, overallBudgetPeriod: 'monthly' as const },
      pomodoroStore: { sessions: [], workDuration: 25, breakDuration: 5, status: 'idle' as const, phase: 'work' as const, secondsRemaining: 1500, cycleCount: 0, selectedTaskId: null, cycleStartedAt: null },
      settingsStore: { themePreference: 'system' as const },
      updatedAt: new Date().toISOString(),
    };
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(true);
  });

  it('returns false and sets error when pull throws a non-Error value', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'unexpected' } });
    const result = await pullForCurrentUser();
    // pullCloudSnapshot throws the error object (not an Error instance)
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('Pull failed');
  });
});

// ---------------------------------------------------------------------------
describe('pushForCurrentUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockUpsert.mockReset();
    useSyncStore.setState({ isSyncing: false, lastSyncedAt: null, syncError: null });
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      },
    }));
  });

  it('returns false when getUser fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await pushForCurrentUser();
    expect(result).toBe(false);
  });

  it('pushes and returns true on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const result = await pushForCurrentUser();
    expect(result).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('returns false and sets sync error when push throws a non-Error value', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      upsert: (...a: unknown[]) => {
        mockUpsert(...a);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: { message: 'push error' } }).then(r) };
      },
    }));
    const result = await pushForCurrentUser();
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('Sync failed');
  });
});
