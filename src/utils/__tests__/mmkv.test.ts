jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo',
  },
}));

import { mmkvInstance, mmkvStorage } from '../mmkv';

describe('mmkv storage fallback', () => {
  it('uses in-memory fallback when running in Expo Go', () => {
    mmkvStorage.setItem('k', 'v');
    expect(mmkvStorage.getItem('k')).toBe('v');

    mmkvStorage.removeItem('k');
    expect(mmkvStorage.getItem('k')).toBeNull();

    expect(mmkvInstance).toBeNull();
  });
});
