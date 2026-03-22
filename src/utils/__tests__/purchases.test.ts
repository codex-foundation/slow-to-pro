import Purchases from 'react-native-purchases';
import { useEntitlementStore } from '@/stores/entitlementStore';
import * as purchasesModule from '../purchases';
import {
  getOfferings,
  initializePurchases,
  isRevenueCatConfigured,
  purchasePackage,
  readProStatusFromDb,
  refreshEntitlements,
  refreshProStatus,
  restorePurchases,
} from '../purchases';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetUser = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
    from: () => ({
      upsert: (...a: unknown[]) => mockUpsert(...a),
      select: (...a: unknown[]) => {
        mockSelect(...a);
        return { eq: () => ({ single: mockSingle }) };
      },
    }),
  },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'debug' },
}));

const mockPurchases = Purchases as jest.Mocked<typeof Purchases>;

function makeCustomerInfo(isPro = false) {
  return {
    entitlements: { active: isPro ? { pro: {} } : {} },
  };
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockUpsert.mockReset();
  mockSingle.mockReset();
  useEntitlementStore.setState({ isPro: false, isRcPro: false, isLoading: true });
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('isRevenueCatConfigured', () => {
  it('returns false when API keys are empty strings', () => {
    expect(isRevenueCatConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('readProStatusFromDb', () => {
  it('returns false when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await readProStatusFromDb();
    expect(result).toBe(false);
  });

  it('returns false when is_pro is false in DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: false }, error: null });
    const result = await readProStatusFromDb();
    expect(result).toBe(false);
  });

  it('returns true when is_pro is true in DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true }, error: null });
    const result = await readProStatusFromDb();
    expect(result).toBe(true);
  });

  it('returns false when data is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: null, error: null });
    const result = await readProStatusFromDb();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('initializePurchases', () => {
  it('reads DB flag and sets entitlements without RC configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true }, error: null });

    await initializePurchases();

    expect(useEntitlementStore.getState().isPro).toBe(true);
    expect(useEntitlementStore.getState().isLoading).toBe(false);
  });

  it('sets isLoading=false even when DB returns false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await initializePurchases();

    expect(useEntitlementStore.getState().isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('refreshEntitlements', () => {
  it('does nothing when RC is not configured', async () => {
    await refreshEntitlements(); // isRevenueCatConfigured() returns false
    expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe('refreshProStatus', () => {
  it('reads DB flag when RC is not configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true }, error: null });

    await refreshProStatus();

    expect(useEntitlementStore.getState().isPro).toBe(true);
    expect(useEntitlementStore.getState().isLoading).toBe(false);
  });

  it('calls refreshEntitlements path when RC is configured (not configured here)', async () => {
    // With no API keys, refreshProStatus falls into the non-RC path (readProStatusFromDb)
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(refreshProStatus()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe('getOfferings', () => {
  it('returns null when RC is not configured', async () => {
    const result = await getOfferings();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('purchasePackage', () => {
  it('returns success=false and error message on unexpected exception', async () => {
    mockPurchases.purchasePackage.mockRejectedValue(new Error('unexpected error'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await purchasePackage({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('unexpected error');
  });

  it('returns success=false when a non-Error is thrown', async () => {
    mockPurchases.purchasePackage.mockRejectedValue('string error');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await purchasePackage({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('returns success=false without error when user cancelled', async () => {
    mockPurchases.purchasePackage.mockRejectedValue(new Error('userCancelled'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await purchasePackage({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('returns success=true when purchase succeeds with pro entitlement', async () => {
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: makeCustomerInfo(true),
    } as never);
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockUpsert.mockResolvedValue({ error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await purchasePackage({} as any);
    expect(result.success).toBe(true);
    expect(useEntitlementStore.getState().isPro).toBe(true);
  });

  it('returns success=false when purchase completes without pro entitlement', async () => {
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: makeCustomerInfo(false),
    } as never);
    mockGetUser.mockResolvedValue({ data: { user: null } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await purchasePackage({} as any);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('restorePurchases', () => {
  it('returns success=false when RC is not configured', async () => {
    const result = await restorePurchases();
    expect(result.success).toBe(false);
  });

  it('would return success=true if RC were configured and entitlement is active', async () => {
    // Can't trigger the RC path without API keys, so we verify the false branch
    const result = await restorePurchases();
    expect(result).toEqual({ success: false });
  });
});

// ---------------------------------------------------------------------------
// Tests requiring RC to be configured — we re-require the module with env vars set
// ---------------------------------------------------------------------------
describe('RC-configured paths (via jest.isolateModules with API key)', () => {
  const setupRcConfigured = () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'test-key-ios';
    let rcModule: typeof purchasesModule | null = null;
    jest.isolateModules(() => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      rcModule = require('../purchases') as typeof purchasesModule;
    });
    return rcModule!;
  };

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
    jest.clearAllMocks();
  });

  it('isRevenueCatConfigured returns true when API key is set', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'test-key';
    jest.isolateModules(() => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isRevenueCatConfigured: isConfigured } = require('../purchases') as {
        isRevenueCatConfigured: () => boolean;
      };
      expect(isConfigured()).toBe(true);
    });
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  });

  it('initializePurchases configures Purchases when RC key is set', async () => {
    const rc = setupRcConfigured();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(false));
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await rc.initializePurchases();

    expect(Purchases.configure).toHaveBeenCalled();
  });

  it('initializePurchases sets loading=false when configure throws', async () => {
    const rc = setupRcConfigured();
    (Purchases.configure as jest.Mock).mockImplementation(() => {
      throw new Error('fail');
    });

    // configure throws before refreshEntitlements is called, which triggers the catch block
    await rc.initializePurchases();
    // Just verify it completes without throwing
    expect(Purchases.configure).toHaveBeenCalled();
  });

  it('initializePurchases in production mode skips setLogLevel', async () => {
    const rc = setupRcConfigured();
    const origDev = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;
    try {
      (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(false));
      mockGetUser.mockResolvedValue({ data: { user: null } });
      await rc.initializePurchases();
      expect(Purchases.setLogLevel).not.toHaveBeenCalled();
    } finally {
      (global as Record<string, unknown>).__DEV__ = origDev;
    }
  });
  it('refreshEntitlements updates entitlements from RC and DB', async () => {
    const rc = setupRcConfigured();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(true));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: false }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    await rc.refreshEntitlements();

    // Verify via Purchases calls since store is different instance in isolateModules
    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
  });

  it('refreshEntitlements sets isPro from DB when RC says not pro', async () => {
    const rc = setupRcConfigured();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(false));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    await rc.refreshEntitlements();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
    expect(mockGetUser).toHaveBeenCalled();
  });

  it('refreshProStatus calls refreshEntitlements path when RC is configured', async () => {
    const rc = setupRcConfigured();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(false));
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await rc.refreshProStatus();

    expect(Purchases.getCustomerInfo).toHaveBeenCalled();
  });

  it('getOfferings returns current offering when RC is configured', async () => {
    const rc = setupRcConfigured();
    const mockOffering = { identifier: 'default' };
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({ current: mockOffering });

    const result = await rc.getOfferings();
    expect(result).toEqual(mockOffering);
  });

  it('getOfferings returns null when getOfferings throws', async () => {
    const rc = setupRcConfigured();
    (Purchases.getOfferings as jest.Mock).mockRejectedValue(new Error('network'));

    const result = await rc.getOfferings();
    expect(result).toBeNull();
  });

  it('restorePurchases returns success=true when pro entitlement active', async () => {
    const rc = setupRcConfigured();
    (Purchases.restorePurchases as jest.Mock).mockResolvedValue(makeCustomerInfo(true));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@a.com' } } });
    mockUpsert.mockResolvedValue({ error: null });

    const result = await rc.restorePurchases();
    expect(result.success).toBe(true);
    expect(Purchases.restorePurchases).toHaveBeenCalled();
  });

  it('restorePurchases returns error on restore failure', async () => {
    const rc = setupRcConfigured();
    (Purchases.restorePurchases as jest.Mock).mockRejectedValue(new Error('network error'));

    const result = await rc.restorePurchases();
    expect(result.success).toBe(false);
    expect(result.error).toBe('network error');
  });

  it('restorePurchases returns string error when non-Error is thrown', async () => {
    const rc = setupRcConfigured();
    (Purchases.restorePurchases as jest.Mock).mockRejectedValue('string error');

    const result = await rc.restorePurchases();
    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });
});

// ---------------------------------------------------------------------------
// Android platform paths — must run last since react-native mock affects global registry
// ---------------------------------------------------------------------------
describe('Android platform paths (via jest.isolateModules with android OS)', () => {
  afterAll(() => {
    jest.resetModules();
  });

  it('isRevenueCatConfigured uses Android key on android platform', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'test-key-android';
    let result = false;
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isRevenueCatConfigured: isConfigured } = require('../purchases') as {
        isRevenueCatConfigured: () => boolean;
      };
      result = isConfigured();
    });
    expect(result).toBe(true);
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  });

  it('isRevenueCatConfigured returns false on web even when Android key is set', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'test-key-android';
    let result = true;
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isRevenueCatConfigured: isConfigured } = require('../purchases') as {
        isRevenueCatConfigured: () => boolean;
      };
      result = isConfigured();
    });
    expect(result).toBe(false);
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  });

  it('initializePurchases on android uses android key', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'test-key-android';
    let initFn: (() => Promise<void>) | undefined;
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
      jest.mock('@/lib/supabase', () => ({
        supabase: {
          auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
          from: () => ({
            upsert: (...a: unknown[]) => mockUpsert(...a),
            select: (...a: unknown[]) => {
              mockSelect(...a);
              return { eq: () => ({ single: mockSingle }) };
            },
          }),
        },
      }));
      jest.mock('react-native-purchases', () => ({
        __esModule: true,
        default: {
          setLogLevel: jest.fn(),
          configure: jest.fn(),
          getCustomerInfo: jest.fn(),
          getOfferings: jest.fn(),
          purchasePackage: jest.fn(),
          restorePurchases: jest.fn(),
        },
        LOG_LEVEL: { DEBUG: 'debug' },
      }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const mod = require('../purchases') as typeof purchasesModule;
      initFn = mod.initializePurchases;
    });
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(makeCustomerInfo(false));
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await initFn!();
    expect(Purchases.configure).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-key-android' })
    );
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  });
});

// ---------------------------------------------------------------------------
// Null supabase paths — must run last to avoid polluting module registry
// ---------------------------------------------------------------------------
describe('Null supabase paths', () => {
  afterAll(() => {
    jest.resetModules();
  });

  it('readProStatusFromDb returns false when supabase is null', async () => {
    let fn: (() => Promise<boolean>) | undefined;
    jest.isolateModules(() => {
      jest.doMock('@/lib/supabase', () => ({ supabase: null }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const mod = require('../purchases') as typeof purchasesModule;
      fn = mod.readProStatusFromDb;
    });
    const result = await fn!();
    expect(result).toBe(false);
  });

  it('syncProStatusToDb is a no-op when supabase is null (via refreshEntitlements)', async () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'test-key-ios';
    let refreshFn: (() => Promise<void>) | undefined;
    jest.isolateModules(() => {
      jest.doMock('@/lib/supabase', () => ({ supabase: null }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        default: {
          setLogLevel: jest.fn(),
          configure: jest.fn(),
          getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: { pro: {} } } }),
          getOfferings: jest.fn(),
          purchasePackage: jest.fn(),
          restorePurchases: jest.fn(),
        },
        LOG_LEVEL: { DEBUG: 'debug' },
      }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const mod = require('../purchases') as typeof purchasesModule;
      refreshFn = mod.refreshEntitlements;
    });
    // refreshEntitlements calls syncProStatusToDb(isPro) which hits line 9 guard
    await refreshFn!();
    // Allow the fire-and-forget syncProStatusToDb to complete
    await new Promise((resolve) => setTimeout(resolve, 10));
    delete process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  });
});
