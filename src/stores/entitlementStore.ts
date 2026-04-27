import { create } from 'zustand';

export interface EntitlementStore {
  isPro: boolean;
  isLoading: boolean;
  setIsPro: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

export const useEntitlementStore = create<EntitlementStore>()((set) => ({
  isPro: false,
  isLoading: true,
  setIsPro: (value) => set({ isPro: value }),
  setLoading: (value) => set({ isLoading: value }),
}));
