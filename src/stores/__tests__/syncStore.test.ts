import { useSyncStore } from '../syncStore';

beforeEach(() => {
  useSyncStore.setState({ lastSyncedAt: null, isSyncing: false, syncError: null });
});

describe('syncStore', () => {
  it('starts with default state', () => {
    const { lastSyncedAt, isSyncing, syncError } = useSyncStore.getState();
    expect(lastSyncedAt).toBeNull();
    expect(isSyncing).toBe(false);
    expect(syncError).toBeNull();
  });

  it('setSyncing sets isSyncing', () => {
    useSyncStore.getState().setSyncing(true);
    expect(useSyncStore.getState().isSyncing).toBe(true);
    useSyncStore.getState().setSyncing(false);
    expect(useSyncStore.getState().isSyncing).toBe(false);
  });

  it('setSynced clears error, sets lastSyncedAt and stops syncing', () => {
    useSyncStore.setState({ isSyncing: true, syncError: 'oops' });
    const before = Date.now();
    useSyncStore.getState().setSynced();
    const after = Date.now();
    const { lastSyncedAt, isSyncing, syncError } = useSyncStore.getState();
    expect(isSyncing).toBe(false);
    expect(syncError).toBeNull();
    expect(lastSyncedAt).not.toBeNull();
    expect(lastSyncedAt!).toBeGreaterThanOrEqual(before);
    expect(lastSyncedAt!).toBeLessThanOrEqual(after);
  });

  it('setSyncError sets error and stops syncing', () => {
    useSyncStore.setState({ isSyncing: true });
    useSyncStore.getState().setSyncError('network error');
    const { syncError, isSyncing } = useSyncStore.getState();
    expect(syncError).toBe('network error');
    expect(isSyncing).toBe(false);
  });
});
