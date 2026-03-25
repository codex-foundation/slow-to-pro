import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSyncStore } from '@/stores/syncStore';
import { useTaskStore } from '@/stores/taskStore';
import {
  isApplyingSnapshot,
  pullCloudSnapshot,
  pullForCurrentUser,
  pushCloudSnapshot,
  pushForCurrentUser,
  syncFromCloudOrSeed,
} from '../cloudSync';

// ---------------------------------------------------------------------------
// Minimal mock supabase
// ---------------------------------------------------------------------------
const mockSelect = jest.fn();
const mockUpsert = jest.fn();
const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  CLOUD_SYNC_TABLE: 'user_sync_snapshots',
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: () => ({
      select: (...a: unknown[]) => {
        mockSelect(...a);
        return { eq: () => ({ maybeSingle: mockMaybeSingle }) };
      },
      upsert: (...a: unknown[]) => mockUpsert(...a),
    }),
  },
}));

const makeSnapshot = () => ({
  taskStore: { tasks: [], lastResetDate: '2026-03-01' },
  financeStore: {
    categories: [{ id: 'c1', name: 'Food', color: '#f00' }],
    budgets: [],
    expenses: [],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly' as const,
  },
  pomodoroStore: {
    sessions: [],
    workDuration: 25,
    breakDuration: 5,
    status: 'idle' as const,
    phase: 'work' as const,
    secondsRemaining: 1500,
    cycleCount: 0,
    selectedTaskId: null,
    cycleStartedAt: null,
  },
  settingsStore: { themePreference: 'dark' as const },
  updatedAt: new Date().toISOString(),
});

beforeEach(() => {
  mockGetUser.mockReset();
  mockUpsert.mockReset();
  mockMaybeSingle.mockReset();
  useSyncStore.setState({ lastSyncedAt: null, isSyncing: false, syncError: null });
  useTaskStore.setState({ tasks: [], lastResetDate: '2026-01-01' });
  useFinanceStore.setState({
    categories: [],
    budgets: [],
    expenses: [],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly',
  });
  useSettingsStore.setState({ themePreference: 'system' });
});

describe('isApplyingSnapshot flag', () => {
  it('is false by default', () => {
    expect(isApplyingSnapshot).toBe(false);
  });
});

describe('pullCloudSnapshot', () => {
  it('returns null when no data exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await pullCloudSnapshot('user-1');
    expect(result).toBeNull();
  });

  it('returns snapshot when data exists', async () => {
    const snap = makeSnapshot();
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await pullCloudSnapshot('user-1');
    expect(result).toEqual(snap);
  });

  it('throws when supabase returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db error' } });
    await expect(pullCloudSnapshot('user-1')).rejects.toEqual({ message: 'db error' });
  });
});

describe('pushCloudSnapshot', () => {
  it('calls upsert with user_id and data', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    await pushCloudSnapshot('user-1');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [payload] = mockUpsert.mock.calls[0];
    expect(payload.user_id).toBe('user-1');
    expect(payload.data).toBeDefined();
  });

  it('throws when upsert returns an error', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'write error' } });
    await expect(pushCloudSnapshot('user-1')).rejects.toEqual({ message: 'write error' });
  });
});

describe('syncFromCloudOrSeed', () => {
  it('returns "pulled" and applies snapshot when cloud data exists', async () => {
    const snap = makeSnapshot();
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await syncFromCloudOrSeed('user-1');
    expect(result).toBe('pulled');
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('returns "seeded" and pushes when no cloud data', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    const result = await syncFromCloudOrSeed('user-1');
    expect(result).toBe('seeded');
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });
});

describe('pullForCurrentUser', () => {
  it('returns false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
  });

  it('sets syncError and returns false when no snapshot exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('No cloud data found');
  });

  it('applies snapshot, calls setSynced and returns true on success', async () => {
    const snap = makeSnapshot();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { data: snap }, error: null });
    const result = await pullForCurrentUser();
    expect(result).toBe(true);
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
    expect(useSettingsStore.getState().themePreference).toBe('dark');
  });

  it('sets syncError and returns false when pull throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockMaybeSingle.mockRejectedValue(new Error('network fail'));
    const result = await pullForCurrentUser();
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('network fail');
  });
});

describe('pushForCurrentUser', () => {
  it('returns false when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await pushForCurrentUser();
    expect(result).toBe(false);
  });

  it('pushes data, calls setSynced and returns true on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    const result = await pushForCurrentUser();
    expect(result).toBe(true);
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it('sets syncError and returns false when push throws', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockUpsert.mockResolvedValue({ error: new Error('write failed') });
    const result = await pushForCurrentUser();
    expect(result).toBe(false);
    expect(useSyncStore.getState().syncError).toBe('write failed');
  });
});
