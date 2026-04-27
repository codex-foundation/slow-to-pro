import { useEntitlementStore } from '@/stores/entitlementStore';
import {
  initializePurchases,
  isStripeConfigured,
  purchase,
  readProStatusFromDb,
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
const mockInvoke = jest.fn();

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
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn().mockResolvedValue(undefined),
  initPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
  presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
}));

import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';

const mockInitStripe = initStripe as jest.Mock;
const mockInitPaymentSheet = initPaymentSheet as jest.Mock;
const mockPresentPaymentSheet = presentPaymentSheet as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockUpsert.mockResolvedValue({ error: null });
  mockSingle.mockResolvedValue({ data: null });
  mockInvoke.mockResolvedValue({ data: null, error: null });
  mockInitStripe.mockResolvedValue(undefined);
  mockInitPaymentSheet.mockResolvedValue({ error: null });
  mockPresentPaymentSheet.mockResolvedValue({ error: null });
  useEntitlementStore.setState({ isPro: false, isLoading: true });
});

// ---------------------------------------------------------------------------
describe('isStripeConfigured', () => {
  it('returns false when env vars are empty', () => {
    expect(isStripeConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('readProStatusFromDb', () => {
  it('returns false when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await readProStatusFromDb()).toBe(false);
  });

  it('returns false when is_pro is false in DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: false } });
    expect(await readProStatusFromDb()).toBe(false);
  });

  it('returns true when is_pro is true in DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true } });
    expect(await readProStatusFromDb()).toBe(true);
  });

  it('returns false when data is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: null });
    expect(await readProStatusFromDb()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('initializePurchases', () => {
  it('reads DB flag and sets entitlements (Stripe not configured)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true } });

    await initializePurchases();

    expect(useEntitlementStore.getState().isPro).toBe(true);
    expect(useEntitlementStore.getState().isLoading).toBe(false);
    expect(mockInitStripe).not.toHaveBeenCalled();
  });

  it('sets isLoading=false when user unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await initializePurchases();

    expect(useEntitlementStore.getState().isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('refreshProStatus', () => {
  it('reads DB flag and updates store', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true } });

    await refreshProStatus();

    expect(useEntitlementStore.getState().isPro).toBe(true);
    expect(useEntitlementStore.getState().isLoading).toBe(false);
  });

  it('sets isPro=false when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await refreshProStatus();

    expect(useEntitlementStore.getState().isPro).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('purchase', () => {
  it('returns error when Stripe not configured', async () => {
    const result = await purchase();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Stripe not configured.');
  });

  it('returns success=false with error when invoke fails', async () => {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_key';
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_123';

    let purchaseFn: typeof purchase | undefined;
    jest.isolateModules(() => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const mod = require('../purchases') as typeof import('../purchases');
      purchaseFn = mod.purchase;
    });

    mockInvoke.mockResolvedValue({ data: null, error: { message: 'network error' } });

    const result = await purchaseFn!();
    expect(result.success).toBe(false);
    expect(result.error).toBe('network error');

    delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });

  it('returns success=true when already subscribed', async () => {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_key';
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_123';

    let purchaseFn: typeof purchase | undefined;
    jest.isolateModules(() => {
      jest.doMock('@/lib/supabase', () => ({
        supabase: {
          auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
          from: () => ({
            upsert: (...a: unknown[]) => mockUpsert(...a),
            select: (...a: unknown[]) => ({ eq: () => ({ single: mockSingle }) }),
          }),
          functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
        },
      }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const mod = require('../purchases') as typeof import('../purchases');
      purchaseFn = mod.purchase;
    });

    mockInvoke.mockResolvedValue({ data: { alreadySubscribed: true }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true } });

    const result = await purchaseFn!();
    expect(result.success).toBe(true);

    delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });
});

// ---------------------------------------------------------------------------
describe('restorePurchases', () => {
  it('returns success=true when DB says pro', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockSingle.mockResolvedValue({ data: { is_pro: true } });

    const result = await restorePurchases();
    expect(result.success).toBe(true);
  });

  it('returns success=false when DB says not pro', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await restorePurchases();
    expect(result.success).toBe(false);
  });
});
