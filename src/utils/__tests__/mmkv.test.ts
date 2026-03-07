describe('mmkv storage fallback', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses in-memory fallback in Expo Go even when MMKV package throws', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        appOwnership: 'expo',
      },
    }));
    jest.doMock('react-native-mmkv', () => {
      throw new Error('NitroModules are not supported in Expo Go!');
    });

    jest.isolateModules(() => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
      const { mmkvInstance, mmkvStorage } = require('../mmkv') as typeof import('../mmkv');

      mmkvStorage.setItem('k', 'v');
      expect(mmkvStorage.getItem('k')).toBe('v');

      mmkvStorage.removeItem('k');
      expect(mmkvStorage.getItem('k')).toBeNull();

      expect(mmkvInstance).toBeNull();
    });
  });

  it('falls back to in-memory storage when MMKV initialization throws outside Expo Go', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        appOwnership: 'standalone',
      },
    }));
    jest.doMock('react-native-mmkv', () => ({
      MMKV: class {
        constructor() {
          throw new Error('MMKV init failed');
        }
      },
    }));

    jest.isolateModules(() => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
      const { mmkvInstance, mmkvStorage } = require('../mmkv') as typeof import('../mmkv');

      mmkvStorage.setItem('a', '1');
      expect(mmkvStorage.getItem('a')).toBe('1');
      expect(mmkvInstance).toBeNull();
    });
  });
});
