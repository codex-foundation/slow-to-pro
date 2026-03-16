import { create } from 'zustand';

interface SyncStore {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
  setSyncing: (v: boolean) => void;
  setSynced: () => void;
  setSyncError: (err: string) => void;
}

export const useSyncStore = create<SyncStore>()((set) => ({
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,
  setSyncing: (v) => set({ isSyncing: v }),
  setSynced: () => set({ lastSyncedAt: Date.now(), syncError: null, isSyncing: false }),
  setSyncError: (err) => set({ syncError: err, isSyncing: false }),
}));
