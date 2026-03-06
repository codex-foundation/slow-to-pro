import Constants from 'expo-constants';
import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

type AppStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStore = new Map<string, string>();

const memoryStorage: AppStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

const isExpoGo = Constants.appOwnership === 'expo';

function createNativeStorage(): {
  appStorage: AppStorage;
  mmkvInstance: unknown | null;
} {
  if (isExpoGo) {
    return { appStorage: memoryStorage, mmkvInstance: null };
  }

  try {
    const instance = new MMKV();

    return {
      mmkvInstance: instance,
      appStorage: {
        getItem: (key: string) => instance.getString(key) ?? null,
        setItem: (key: string, value: string) => instance.set(key, value),
        removeItem: (key: string) => instance.delete(key),
      },
    };
  } catch {
    return { appStorage: memoryStorage, mmkvInstance: null };
  }
}

const storage = createNativeStorage();

export const mmkvInstance = storage.mmkvInstance;

export const appStorage = storage.appStorage;

export const mmkvStorage: StateStorage = {
  getItem: (name) => appStorage.getItem(name),
  setItem: (name, value) => appStorage.setItem(name, value),
  removeItem: (name) => appStorage.removeItem(name),
};
