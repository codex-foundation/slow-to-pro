import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/utils/mmkv';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsStore {
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (value) => set({ themePreference: value }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
