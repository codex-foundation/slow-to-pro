import { create } from 'zustand';

export interface EntitlementStore {
  isPro: boolean;
  isRcPro: boolean;
  isLoading: boolean;
  setIsPro: (value: boolean) => void;
  setIsRcPro: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

export const useEntitlementStore = create<EntitlementStore>()((set) => ({
  isPro: false,
  isRcPro: false,
  isLoading: true,
  setIsPro: (value) => set({ isPro: value }),
  setIsRcPro: (value) => set({ isRcPro: value }),
  setLoading: (value) => set({ isLoading: value }),
}));
