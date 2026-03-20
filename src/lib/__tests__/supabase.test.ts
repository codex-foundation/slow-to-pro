describe('supabase module', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('exports isSupabaseConfigured=false when env vars are missing', () => {
    jest.isolateModules(() => {
      jest.doMock('@/utils/mmkv', () => ({
        appStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
      }));

      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
      const { isSupabaseConfigured, supabase } =
        require('../supabase') as typeof import('../supabase');
      expect(isSupabaseConfigured).toBe(false);
      expect(supabase).toBeNull();
    });
  });

  it('exports isSupabaseConfigured=true and a client when env vars are set', () => {
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    try {
      jest.isolateModules(() => {
        // Stub createClient so the real network call never happens
        jest.doMock('@supabase/supabase-js', () => ({
          createClient: jest.fn((_url: string, _key: string, opts: unknown) => ({ _opts: opts })),
        }));
        jest.doMock('@/utils/mmkv', () => ({
          appStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
        }));

        // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
        const { isSupabaseConfigured, supabase } =
          require('../supabase') as typeof import('../supabase');
        expect(isSupabaseConfigured).toBe(true);
        expect(supabase).not.toBeNull();
      });
    } finally {
      if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
      else delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = origKey;
      else delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  it('sbStorage getItem/setItem/removeItem delegate to appStorage', async () => {
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    let capturedSetItem: ((k: string, v: string) => Promise<void>) | null = null;
    let capturedGetItem: ((k: string) => Promise<string | null>) | null = null;
    let capturedRemoveItem: ((k: string) => Promise<void>) | null = null;

    try {
      const store = new Map<string, string>();
      const mockStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      };

      jest.isolateModules(() => {
        jest.doMock('@supabase/supabase-js', () => ({
          createClient: jest.fn(
            (_url: string, _key: string, opts: { auth?: { storage?: unknown } }) => {
              const s = opts.auth?.storage as {
                getItem: typeof capturedGetItem;
                setItem: typeof capturedSetItem;
                removeItem: typeof capturedRemoveItem;
              };
              capturedGetItem = s.getItem;
              capturedSetItem = s.setItem;
              capturedRemoveItem = s.removeItem;
              return { _opts: opts };
            }
          ),
        }));
        jest.doMock('@/utils/mmkv', () => ({ appStorage: mockStorage }));
        // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
        require('../supabase');
      });

      expect(capturedSetItem).not.toBeNull();
      expect(capturedGetItem).not.toBeNull();
      expect(capturedRemoveItem).not.toBeNull();

      await capturedSetItem!('test-key', 'test-value');
      expect(store.get('test-key')).toBe('test-value');

      const val = await capturedGetItem!('test-key');
      expect(val).toBe('test-value');

      await capturedRemoveItem!('test-key');
      expect(store.has('test-key')).toBe(false);
    } finally {
      if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
      else delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = origKey;
      else delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  });
});
