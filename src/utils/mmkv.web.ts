import type { StateStorage } from 'zustand/middleware';

export const appStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export const mmkvStorage: StateStorage = {
  getItem: (name) => appStorage.getItem(name),
  setItem: (name, value) => appStorage.setItem(name, value),
  removeItem: (name) => appStorage.removeItem(name),
};
