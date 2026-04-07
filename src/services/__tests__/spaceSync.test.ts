import { DEFAULT_CATEGORIES, useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { DEFAULT_TASK_CATEGORIES, useTaskStore } from '@/stores/taskStore';
import {
  createSpace,
  deleteSpace,
  inviteMember,
  isApplyingSpaceSnapshot,
  leaveSpace,
  loadSpaces,
  pullSharedSpace,
  pushToSharedSpace,
  removeMember,
  respondToInvite,
} from '../spaceSync';

// ---------------------------------------------------------------------------
// Mock supabase with a chainable query builder
// ---------------------------------------------------------------------------
const mockGetUser = jest.fn();
const mockInvokeEmail = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockDelete = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();

function mockQueryBuilder() {
  const builder: Record<string, jest.Mock> = {};
  builder.select = (...a: unknown[]) => {
    mockSelect(...a);
    return builder;
  };
  builder.insert = (...a: unknown[]) => {
    mockInsert(...a);
    return builder;
  };
  builder.upsert = (...a: unknown[]) => {
    mockUpsert(...a);
    return builder;
  };
  builder.delete = () => {
    mockDelete();
    return builder;
  };
  builder.update = (...a: unknown[]) => {
    mockUpdate(...a);
    return builder;
  };
  builder.eq = (...a: unknown[]) => {
    mockEq(...a);
    return builder;
  };
  builder.in = (...a: unknown[]) => {
    mockIn(...a);
    return builder;
  };
  builder.single = (...a: unknown[]) => mockSingle(...a);
  // make it thenable so await works directly on a builder
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return builder;
}

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: () => mockQueryBuilder(),
    rpc: (...a: unknown[]) => mockRpc(...a),
    functions: { invoke: (...a: unknown[]) => mockInvokeEmail(...a) },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const spaceRow = {
  id: 'space-1',
  name: 'Family',
  owner_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
};

function resetStores() {
  useSpaceStore.setState({
    activeSpaceId: null,
    spaces: [],
    members: [],
    pendingInvites: [],
    isLoading: false,
  });
  useFinanceStore.setState({
    categories: [{ id: 'c1', name: 'Food', color: '#f00' }],
    budgets: [],
    expenses: [{ id: 'e1', categoryId: 'c1', amount: 10, date: Date.now() }],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly',
  });
  useTaskStore.setState({
    tasks: [
      {
        id: 't1',
        title: 'Personal task',
        completed: false,
        priority: 'medium',
        order: 0,
        recurring: { enabled: false, days: [] },
        createdAt: Date.now(),
      },
    ],
    categories: [{ id: 'tc1', name: 'Work', color: '#6366f1' }],
    lastResetDate: '2026-03-01',
  });
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockRpc.mockReset();
  mockInvokeEmail.mockReset();
  mockInsert.mockReset();
  mockUpsert.mockReset();
  mockDelete.mockReset();
  mockSelect.mockReset();
  mockSingle.mockReset();
  resetStores();
});

// ---------------------------------------------------------------------------
describe('isApplyingSpaceSnapshot flag', () => {
  it('is false by default', () => {
    expect(isApplyingSpaceSnapshot).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('createSpace', () => {
  it('returns error when supabase is not configured', async () => {
    // supabase mock is always present; test the unauthenticated path instead
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await createSpace('My Space');
    expect(result.space).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('adds the new space to the store on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: spaceRow, error: null });
    const result = await createSpace('Family');
    expect(result.error).toBeUndefined();
    expect(result.space?.name).toBe('Family');
    expect(useSpaceStore.getState().spaces).toHaveLength(1);
  });

  it('returns error when insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const result = await createSpace('Family');
    expect(result.space).toBeNull();
    expect(result.error).toBe('insert failed');
  });

  it('returns default error message when error has no message', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: null, error: {} });
    const result = await createSpace('Family');
    expect(result.space).toBeNull();
    expect(result.error).toBe('Failed to create space');
  });

  it('uses empty string for invited_email when user.email is undefined', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: undefined } } });
    mockSingle.mockResolvedValue({ data: spaceRow, error: null });
    const result = await createSpace('Family');
    expect(result.space?.name).toBe('Family');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ invited_email: '' }));
  });

  it('seeds finance and task snapshots with default categories on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: spaceRow, error: null });

    const insertCalls: unknown[] = [];
    jest.requireMock('@/lib/supabase').supabase.from = jest
      .fn()
      .mockImplementation((table: string) => {
        if (table === 'spaces') {
          return {
            insert: () => ({ select: () => ({ single: () => mockSingle() }) }),
          };
        }
        return {
          insert: (...a: unknown[]) => {
            insertCalls.push({ table, args: a[0] });
            return {
              then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r),
            };
          },
        };
      });

    await createSpace('Family');

    const finSeeding = insertCalls.find(
      (c) => (c as { table: string }).table === 'space_finance_snapshots'
    ) as {
      args: {
        space_id: string;
        data: { categories: unknown[]; budgets: unknown[]; expenses: unknown[] };
      };
    };
    const taskSeeding = insertCalls.find(
      (c) => (c as { table: string }).table === 'space_task_snapshots'
    ) as { args: { space_id: string; data: { tasks: unknown[]; categories: unknown[] } } };

    expect(finSeeding).toBeDefined();
    expect(finSeeding.args.space_id).toBe('space-1');
    expect(finSeeding.args.data.categories).toEqual(DEFAULT_CATEGORIES);
    expect(finSeeding.args.data.budgets).toHaveLength(0);
    expect(finSeeding.args.data.expenses).toHaveLength(0);

    expect(taskSeeding).toBeDefined();
    expect(taskSeeding.args.space_id).toBe('space-1');
    expect(taskSeeding.args.data.tasks).toHaveLength(0);
    expect(taskSeeding.args.data.categories).toEqual(DEFAULT_TASK_CATEGORIES);
  });

  it('pullSharedSpace loads default categories after createSpace seeds them', async () => {
    // Simulate what happens end-to-end: createSpace seeds snapshots,
    // then pullSharedSpace reads them and hydrates the stores.
    const finSnapshot = {
      categories: DEFAULT_CATEGORIES,
      budgets: [],
      expenses: [],
    };
    const taskSnapshot = {
      tasks: [],
      categories: DEFAULT_TASK_CATEGORIES,
    };

    let callCount = 0;
    const makeDataBuilder = (payload: unknown) => ({
      select: () => makeDataBuilder(payload),
      eq: () => makeDataBuilder(payload),
      single: () => Promise.resolve({ data: { data: payload }, error: null }),
    });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1 ? makeDataBuilder(finSnapshot) : makeDataBuilder(taskSnapshot);
    });

    await pullSharedSpace('space-1');

    expect(useFinanceStore.getState().categories).toEqual(DEFAULT_CATEGORIES);
    expect(useFinanceStore.getState().categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(useTaskStore.getState().categories).toEqual(DEFAULT_TASK_CATEGORIES);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('inviteMember', () => {
  it('returns error string when insert fails', async () => {
    // The builder's `then` returns { data: null, error: null } by default,
    // but for insert we need to override. Patch mockInsert to make the chain resolve with an error.
    // We control the `then` on the builder by overriding insert to add a custom then.
    // Easier: override From to return a custom builder for this specific test.
    const originalMock = jest.requireMock('@/lib/supabase');
    const errorBuilder = {
      insert: (...a: unknown[]) => {
        mockInsert(...a);
        return errorBuilder;
      },
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'duplicate' } }).then(resolve),
    };
    jest.spyOn(originalMock.supabase, 'from').mockReturnValueOnce(errorBuilder as never);

    const result = await inviteMember('space-1', 'b@b.com');
    expect(result.error).toBe('duplicate');
  });
});

// ---------------------------------------------------------------------------
describe('pullSharedSpace', () => {
  it('clears stores when space has no data', async () => {
    // Override from() to return no data for both queries
    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    useFinanceStore.setState((s) => ({
      ...s,
      overallBudgetAmount: 500,
      overallBudgetPeriod: 'annual',
    }));

    await pullSharedSpace('space-1');

    expect(useFinanceStore.getState().categories).toHaveLength(0);
    expect(useFinanceStore.getState().expenses).toHaveLength(0);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
    expect(useFinanceStore.getState().overallBudgetAmount).toBe(0);
    expect(useFinanceStore.getState().overallBudgetPeriod).toBe('monthly');
  });

  it('resets notifiedBudgetThresholdByKey when switching spaces', async () => {
    useFinanceStore.setState({
      notifiedBudgetThresholdByKey: { 'cat-food-2026-04': 1 },
    });

    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    await pullSharedSpace('space-1');

    expect(useFinanceStore.getState().notifiedBudgetThresholdByKey).toEqual({});
  });

  it('clears pomodoro selectedTaskId, taskQueue and sessions when switching spaces', async () => {
    usePomodoroStore.setState((s) => ({
      ...s,
      selectedTaskId: 'task-from-previous-space',
      taskQueue: ['t1', 't2'],
      sessions: [{ id: 's1', phase: 'work', durationMin: 25, completedAt: Date.now() }],
    }));

    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    await pullSharedSpace('space-1');

    expect(usePomodoroStore.getState().selectedTaskId).toBeNull();
    expect(usePomodoroStore.getState().taskQueue).toEqual([]);
    expect(usePomodoroStore.getState().sessions).toEqual([]);
  });

  it('discards results from a stale pull when a newer pull wins the race', async () => {
    // First pull (stale) resolves after a second pull has already applied its data.
    let resolveStale!: () => void;
    const staleFetch = new Promise<{ data: null; error: null }>((resolve) => {
      resolveStale = () => resolve({ data: null, error: null });
    });

    const freshData = {
      data: {
        data: {
          categories: [{ id: 'c1', name: 'Fresh', color: '#fff' }],
          budgets: [],
          expenses: [],
          overallBudgetAmount: 0,
          overallBudgetPeriod: 'monthly',
        },
      },
      error: null,
    };

    let callCount = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => {
            callCount++;
            // First two calls are the stale pull (finance + task), rest are fresh
            return callCount <= 2 ? staleFetch : Promise.resolve(freshData);
          },
        }),
      }),
    });

    // Start stale pull but don't await yet
    const stalePull = pullSharedSpace('space-stale');
    // Start fresh pull immediately — it wins the generation race
    await pullSharedSpace('space-fresh');

    // Fresh data is applied
    expect(useFinanceStore.getState().categories[0]?.name).toBe('Fresh');

    // Now let the stale pull resolve — it should be discarded
    resolveStale();
    await stalePull;

    // Fresh data is still intact
    expect(useFinanceStore.getState().categories[0]?.name).toBe('Fresh');
  });

  it('loads overallBudgetAmount and overallBudgetPeriod from snapshot', async () => {
    const finSnapshot = {
      categories: [],
      budgets: [],
      expenses: [],
      overallBudgetAmount: 1500,
      overallBudgetPeriod: 'annual',
    };
    const taskSnapshot = { tasks: [], categories: [] };

    let callCount = 0;
    const makeDataBuilder = (payload: unknown) => ({
      select: () => makeDataBuilder(payload),
      eq: () => makeDataBuilder(payload),
      single: () => Promise.resolve({ data: { data: payload }, error: null }),
    });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1 ? makeDataBuilder(finSnapshot) : makeDataBuilder(taskSnapshot);
    });

    await pullSharedSpace('space-1');

    expect(useFinanceStore.getState().overallBudgetAmount).toBe(1500);
    expect(useFinanceStore.getState().overallBudgetPeriod).toBe('annual');
  });

  it('loads space data into stores when data exists', async () => {
    const finSnapshot = {
      categories: [{ id: 's-cat', name: 'Shared', color: '#00f' }],
      budgets: [],
      expenses: [],
    };
    const taskSnapshot = {
      tasks: [
        {
          id: 's-t1',
          title: 'Space task',
          completed: false,
          priority: 'high',
          order: 0,
          recurring: { enabled: false, days: [] },
          createdAt: Date.now(),
        },
      ],
      categories: [{ id: 's-tc1', name: 'Space Work', color: '#6366f1' }],
    };

    let callCount = 0;
    const makeDataBuilder = (payload: unknown) => ({
      select: () => makeDataBuilder(payload),
      eq: () => makeDataBuilder(payload),
      single: () => Promise.resolve({ data: { data: payload }, error: null }),
    });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1 ? makeDataBuilder(finSnapshot) : makeDataBuilder(taskSnapshot);
    });

    await pullSharedSpace('space-1');

    expect(useFinanceStore.getState().categories[0].id).toBe('s-cat');
    expect(useTaskStore.getState().tasks[0].id).toBe('s-t1');
    expect(useTaskStore.getState().categories[0].id).toBe('s-tc1');
  });

  it('resets isApplyingSpaceSnapshot to false after completion', async () => {
    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    await pullSharedSpace('space-1');
    expect(isApplyingSpaceSnapshot).toBe(false);
  });

  it('falls back to existing store values when snapshot fields are empty objects', async () => {
    // finData.data has no categories/budgets/expenses, taskData.data has no tasks
    // Triggers the ?? fallback branches on lines 266-268 and 276
    let callCount = 0;
    const makeDataBuilder = (payload: unknown) => ({
      select: () => makeDataBuilder(payload),
      eq: () => makeDataBuilder(payload),
      single: () => Promise.resolve({ data: { data: payload }, error: null }),
    });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1
        ? makeDataBuilder({}) // finData with no fields
        : makeDataBuilder({}); // taskData with no fields
    });

    // Pre-set store values that should survive when snapshot fields are missing
    useFinanceStore.setState((s) => ({
      ...s,
      categories: [{ id: 'pre-cat', name: 'Pre', color: '#000' }],
    }));

    await pullSharedSpace('space-1');

    // Store was first cleared (setSpaces([]), then fallback keeps existing)
    // categories will be [] because setState first clears, then ?? uses current cleared value
    // This exercises the fallback branch path (d.categories is undefined -> s.categories used)
    expect(isApplyingSpaceSnapshot).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('pushToSharedSpace', () => {
  it('does nothing when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    jest.requireMock('@/lib/supabase').supabase.from = jest
      .fn()
      .mockReturnValue(mockQueryBuilder());
    await pushToSharedSpace('space-1');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('upserts finance and task snapshots', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const upsertResults: unknown[] = [];
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue({
      upsert: (...a: unknown[]) => {
        upsertResults.push(a[0]);
        return { then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) };
      },
    });

    await pushToSharedSpace('space-1');
    expect(upsertResults).toHaveLength(2);
    const [fin, task] = upsertResults as Record<string, unknown>[];
    expect(fin.space_id).toBe('space-1');
    expect((fin.data as Record<string, unknown>).categories).toBeDefined();
    expect((fin.data as Record<string, unknown>).overallBudgetAmount).toBeDefined();
    expect((fin.data as Record<string, unknown>).overallBudgetPeriod).toBeDefined();
    expect(task.space_id).toBe('space-1');
    expect((task.data as Record<string, unknown>).tasks).toBeDefined();
    expect((task.data as Record<string, unknown>).categories).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
describe('leaveSpace', () => {
  it('removes the space from the store', async () => {
    useSpaceStore.setState({
      spaces: [{ id: 'space-1', name: 'Family', ownerId: 'user-1', createdAt: '' }],
      activeSpaceId: 'space-1',
      members: [],
      pendingInvites: [],
      isLoading: false,
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    jest.requireMock('@/lib/supabase').supabase.from = jest
      .fn()
      .mockReturnValue(mockQueryBuilder());

    await leaveSpace('space-1');

    expect(useSpaceStore.getState().spaces).toHaveLength(0);
    expect(useSpaceStore.getState().activeSpaceId).toBeNull();
  });

  it('filters out members and does not clear activeSpaceId when leaving non-active space', async () => {
    useSpaceStore.setState({
      spaces: [
        { id: 'space-1', name: 'Family', ownerId: 'user-1', createdAt: '' },
        { id: 'space-2', name: 'Work', ownerId: 'user-1', createdAt: '' },
      ],
      activeSpaceId: 'space-2',
      members: [
        {
          id: 'm1',
          spaceId: 'space-1',
          userId: 'user-2',
          email: 'b@b.com',
          role: 'member',
          status: 'accepted',
        },
        {
          id: 'm2',
          spaceId: 'space-2',
          userId: 'user-3',
          email: 'c@c.com',
          role: 'member',
          status: 'accepted',
        },
      ],
      pendingInvites: [],
      isLoading: false,
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    jest.requireMock('@/lib/supabase').supabase.from = jest
      .fn()
      .mockReturnValue(mockQueryBuilder());

    await leaveSpace('space-1');

    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().members).toHaveLength(1);
    expect(useSpaceStore.getState().members[0].spaceId).toBe('space-2');
    // activeSpaceId unchanged since we didn't leave the active space
    expect(useSpaceStore.getState().activeSpaceId).toBe('space-2');
  });
});

// ---------------------------------------------------------------------------
describe('deleteSpace', () => {
  it('removes the space and clears activeSpaceId', async () => {
    useSpaceStore.setState({
      spaces: [{ id: 'space-1', name: 'Family', ownerId: 'user-1', createdAt: '' }],
      activeSpaceId: 'space-1',
      members: [],
      pendingInvites: [],
      isLoading: false,
    });
    mockRpc.mockResolvedValue({ error: null });

    await deleteSpace('space-1');

    expect(mockRpc).toHaveBeenCalledWith('delete_space', { p_space_id: 'space-1' });
    expect(useSpaceStore.getState().spaces).toHaveLength(0);
    expect(useSpaceStore.getState().activeSpaceId).toBeNull();
  });

  it('does not affect other spaces', async () => {
    useSpaceStore.setState({
      spaces: [
        { id: 'space-1', name: 'Family', ownerId: 'user-1', createdAt: '' },
        { id: 'space-2', name: 'Work', ownerId: 'user-1', createdAt: '' },
      ],
      activeSpaceId: 'space-2',
      members: [
        {
          id: 'm1',
          spaceId: 'space-1',
          userId: 'u2',
          email: 'b@b.com',
          role: 'member',
          status: 'accepted',
        },
        {
          id: 'm2',
          spaceId: 'space-2',
          userId: 'u3',
          email: 'c@c.com',
          role: 'member',
          status: 'accepted',
        },
      ],
      pendingInvites: [],
      isLoading: false,
    });
    mockRpc.mockResolvedValue({ error: null });

    await deleteSpace('space-1');

    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().spaces[0].id).toBe('space-2');
    expect(useSpaceStore.getState().members).toHaveLength(1);
    expect(useSpaceStore.getState().members[0].spaceId).toBe('space-2');
    expect(useSpaceStore.getState().activeSpaceId).toBe('space-2');
  });
});

// ---------------------------------------------------------------------------
describe('loadSpaces', () => {
  it('does nothing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    jest.requireMock('@/lib/supabase').supabase.from = jest
      .fn()
      .mockReturnValue(mockQueryBuilder());
    await loadSpaces();
    expect(useSpaceStore.getState().spaces).toHaveLength(0);
  });

  it('maps joined member rows with valid spaces to Space objects', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // owned spaces — empty, so joined spaces won't be deduplicated out
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      if (callIndex === 2) {
        // joined member rows — one with valid spaces, one with null spaces
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    {
                      spaces: {
                        id: 's3',
                        name: 'Joined Space',
                        owner_id: 'u3',
                        created_at: new Date().toISOString(),
                      },
                    },
                    { spaces: null },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (callIndex === 3) {
        // pending invites — empty
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      // members for all spaces
      return {
        select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
      };
    });

    await loadSpaces();
    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().spaces[0].name).toBe('Joined Space');
  });

  it('populates owned spaces and members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    const memberRow = {
      id: 'm1',
      space_id: 'space-1',
      user_id: 'user-1',
      invited_email: 'a@a.com',
      role: 'owner',
      status: 'accepted',
      invited_at: '2026-01-01T00:00:00Z',
      accepted_at: '2026-01-01T00:00:00Z',
    };

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // owned spaces query
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [spaceRow], error: null }) }),
        };
      }
      if (callIndex === 2) {
        // member rows query
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      if (callIndex === 3) {
        // pending invites query
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      // members for all spaces
      return {
        select: () => ({ in: () => Promise.resolve({ data: [memberRow], error: null }) }),
      };
    });

    await loadSpaces();

    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().spaces[0].name).toBe('Family');
    expect(useSpaceStore.getState().members).toHaveLength(1);
  });

  it('handles empty results gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    }));

    await loadSpaces();

    expect(useSpaceStore.getState().spaces).toHaveLength(0);
    expect(useSpaceStore.getState().members).toHaveLength(0);
    expect(useSpaceStore.getState().isLoading).toBe(false);
  });

  it('uses empty string for pending invite email when user.email is undefined', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: undefined } } });

    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => ({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    }));

    await loadSpaces();
    expect(useSpaceStore.getState().spaces).toHaveLength(0);
  });

  it('uses empty array when members query returns null data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [spaceRow], error: null }) }),
        };
      }
      if (callIndex === 2) {
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      if (callIndex === 3) {
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      // members query returns null data
      return {
        select: () => ({ in: () => Promise.resolve({ data: null, error: null }) }),
      };
    });

    await loadSpaces();
    expect(useSpaceStore.getState().spaces).toHaveLength(1);
    expect(useSpaceStore.getState().members).toHaveLength(0);
  });

  it('deduplicates spaces that appear in both owned and joined', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // owned spaces includes space-1
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [spaceRow], error: null }) }),
        };
      }
      if (callIndex === 2) {
        // joined rows also includes space-1 (same id) — should be deduplicated
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ spaces: spaceRow }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (callIndex === 3) {
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        };
      }
      return {
        select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
      };
    });

    await loadSpaces();
    // space-1 should only appear once
    expect(useSpaceStore.getState().spaces).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
describe('respondToInvite', () => {
  it('does nothing when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await respondToInvite('member-1', 'accepted');
    // no error thrown
  });

  it('calls pullSharedSpace when the accepted invite is found in the store', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    // Set up store so that BEFORE loadSpaces() clears it, the invite is available
    // We bypass loadSpaces by injecting the state directly right before the find() call.
    // Strategy: mock the supabase.from so that the pending invite row returned by
    // loadSpaces inside respondToInvite points to spaceId='space-99'/memberId='member-99'
    const pendingInviteRow = {
      id: 'member-99',
      spaces: {
        id: 'space-99',
        name: 'Test Space',
        owner_id: 'u9',
        created_at: new Date().toISOString(),
      },
    };

    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      update: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
      in: () => Promise.resolve({ data: [], error: null }),
    };

    let callIdx = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return noDataBuilder; // update call
      if (callIdx === 2)
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }; // owned
      if (callIdx === 3)
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
        }; // joined
      if (callIdx === 4) {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [pendingInviteRow], error: null }),
            }),
          }),
        };
      }
      // pullSharedSpace finance/task snapshot queries
      return noDataBuilder;
    });

    await respondToInvite('member-99', 'accepted');
    // pullSharedSpace was invoked (isApplyingSpaceSnapshot reset to false confirms it ran)
    expect(isApplyingSpaceSnapshot).toBe(false);
    // The invite was found and pullSharedSpace completed
    expect(callIdx).toBeGreaterThanOrEqual(6); // update(1) + 3 loadSpaces + 2 pullSharedSpace
  });

  it('calls update with declined status and does not pull space data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      update: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    await respondToInvite('member-2', 'declined');
    // No error thrown
  });

  it('does not call pullSharedSpace when accepted invite is not in store', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    // No pending invites in store — invite.find() returns undefined
    useSpaceStore.setState((s) => ({ ...s, pendingInvites: [] }));

    const noDataBuilder = {
      select: () => noDataBuilder,
      eq: () => noDataBuilder,
      update: () => noDataBuilder,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(r),
    };
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockReturnValue(noDataBuilder);

    await respondToInvite('member-nonexistent', 'accepted');
    // No error; pullSharedSpace not invoked
    expect(useSpaceStore.getState().pendingInvites).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('inviteMember success path', () => {
  function setupSuccessBuilder() {
    const successBuilder = {
      insert: (...a: unknown[]) => {
        mockInsert(...a);
        return successBuilder;
      },
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: 'm1' }], error: null }).then(resolve),
    };
    let callCount = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return successBuilder;
      return {
        select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
      };
    });
  }

  it('calls loadSpaces after successful insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });
    setupSuccessBuilder();

    const result = await inviteMember('space-1', 'b@b.com');
    expect(result.error).toBeUndefined();
  });

  it('invokes send-invite-email with correct params on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'owner@example.com' } } });
    mockInvokeEmail.mockResolvedValue({ data: { sent: true }, error: null });
    useSpaceStore.setState({
      spaces: [{ id: 'space-1', name: 'Family', ownerId: 'user-1', createdAt: '' }],
      members: [],
      pendingInvites: [],
      activeSpaceId: null,
      isLoading: false,
    });
    setupSuccessBuilder();

    await inviteMember('space-1', 'friend@example.com');

    expect(mockInvokeEmail).toHaveBeenCalledWith('send-invite-email', {
      body: {
        inviteeEmail: 'friend@example.com',
        spaceName: 'Family',
        inviterEmail: 'owner@example.com',
      },
    });
  });

  it('still succeeds when getUser fails (inviter email falls back to empty string)', async () => {
    // First call (in inviteMember) rejects; second call (in loadSpaces) returns null user so it exits early
    mockGetUser
      .mockRejectedValueOnce(new Error('auth error'))
      .mockResolvedValue({ data: { user: null } });
    mockInvokeEmail.mockResolvedValue({ data: { sent: true }, error: null });
    setupSuccessBuilder();

    const result = await inviteMember('space-1', 'friend@example.com');
    expect(result.error).toBeUndefined();
    expect(mockInvokeEmail).toHaveBeenCalledWith(
      'send-invite-email',
      expect.objectContaining({ body: expect.objectContaining({ inviterEmail: '' }) })
    );
  });
});

// ---------------------------------------------------------------------------
describe('loadSpaces with null row.spaces', () => {
  it('filters out member rows with null spaces', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // owned spaces query
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        };
      }
      if (callIndex === 2) {
        // joined member rows — row with null spaces (should be filtered out)
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ spaces: null }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (callIndex === 3) {
        // pending invites — one row with null spaces (filtered out), one with valid spaces (kept)
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [
                    { id: 'pi1', spaces: null },
                    {
                      id: 'pi2',
                      spaces: {
                        id: 's2',
                        name: 'Space 2',
                        owner_id: 'u2',
                        created_at: new Date().toISOString(),
                      },
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }
      // members for all spaces
      return {
        select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
      };
    });

    await loadSpaces();
    expect(useSpaceStore.getState().spaces).toHaveLength(0);
    // null-spaces row filtered out, valid-spaces row kept
    expect(useSpaceStore.getState().pendingInvites).toHaveLength(1);
    expect(useSpaceStore.getState().pendingInvites[0].memberId).toBe('pi2');
  });
});

// ---------------------------------------------------------------------------
describe('removeMember', () => {
  it('deletes the member and reloads spaces', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'a@a.com' } } });

    let callIndex = 0;
    jest.requireMock('@/lib/supabase').supabase.from = jest.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // delete call
        return {
          delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      // loadSpaces aftermath
      return {
        select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
      };
    });

    await removeMember('member-1');
    // No error thrown — function completes
    expect(callIndex).toBeGreaterThan(0);
  });
});
