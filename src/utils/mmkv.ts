import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const mmkvInstance = new MMKV();

export const appStorage = {
  getItem: (key: string) => mmkvInstance.getString(key) ?? null,
  setItem: (key: string, value: string) => mmkvInstance.set(key, value),
  removeItem: (key: string) => mmkvInstance.delete(key),
};

export const mmkvStorage: StateStorage = {
  getItem: (name) => appStorage.getItem(name),
  setItem: (name, value) => appStorage.setItem(name, value),
  removeItem: (name) => appStorage.removeItem(name),
};
