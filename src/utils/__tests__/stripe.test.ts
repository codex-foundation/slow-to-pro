// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

let mockPlatformOS = 'web';
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
  },
}));

let mockSupabase: { functions: { invoke: jest.Mock } } | null = {
  functions: { invoke: mockInvoke },
};

// ---------------------------------------------------------------------------
describe('isStripeConfigured', () => {
  beforeEach(() => {
    mockPlatformOS = 'web';
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });

  it('returns false when STRIPE_PRICE_ID is not set', () => {
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isStripeConfigured } = require('../stripe') as typeof import('../stripe');
      expect(isStripeConfigured()).toBe(false);
    });
  });

  it('returns false on iOS even when STRIPE_PRICE_ID is set', () => {
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_123';
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isStripeConfigured } = require('../stripe') as typeof import('../stripe');
      expect(isStripeConfigured()).toBe(false);
    });
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });

  it('returns false on android even when STRIPE_PRICE_ID is set', () => {
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_123';
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isStripeConfigured } = require('../stripe') as typeof import('../stripe');
      expect(isStripeConfigured()).toBe(false);
    });
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });

  it('returns true on web when STRIPE_PRICE_ID is set', () => {
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_123';
    jest.isolateModules(() => {
      jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { isStripeConfigured } = require('../stripe') as typeof import('../stripe');
      expect(isStripeConfigured()).toBe(true);
    });
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });
});

// ---------------------------------------------------------------------------
describe('createCheckoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = { functions: { invoke: mockInvoke } };
  });

  it('returns error when supabase is null', async () => {
    mockSupabase = null;
    // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
    const { createCheckoutSession } = require('../stripe') as typeof import('../stripe');
    const result = await createCheckoutSession('https://app.com/success', 'https://app.com/cancel');
    expect(result).toEqual({ url: null, error: 'Supabase not configured.' });
  });

  it('calls supabase.functions.invoke with correct params', async () => {
    process.env.EXPO_PUBLIC_STRIPE_PRICE_ID = 'price_abc';
    mockInvoke.mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/pay/cs_test' },
      error: null,
    });
    await jest.isolateModulesAsync(async () => {
      // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
      const { createCheckoutSession } = require('../stripe') as typeof import('../stripe');
      await createCheckoutSession('https://app.com/success', 'https://app.com/cancel');
      expect(mockInvoke).toHaveBeenCalledWith('create-checkout-session', {
        body: {
          priceId: 'price_abc',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        },
      });
    });
    delete process.env.EXPO_PUBLIC_STRIPE_PRICE_ID;
  });

  it('returns the checkout url on success', async () => {
    mockInvoke.mockResolvedValue({
      data: { url: 'https://checkout.stripe.com/pay/cs_test' },
      error: null,
    });
    // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
    const { createCheckoutSession } = require('../stripe') as typeof import('../stripe');
    const result = await createCheckoutSession('https://app.com/success', 'https://app.com/cancel');
    expect(result).toEqual({ url: 'https://checkout.stripe.com/pay/cs_test' });
  });

  it('returns error message on invoke failure', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Function error' } });
    // biome-ignore lint/style/noCommonJs: isolateModules requires sync require
    const { createCheckoutSession } = require('../stripe') as typeof import('../stripe');
    const result = await createCheckoutSession('https://app.com/success', 'https://app.com/cancel');
    expect(result).toEqual({ url: null, error: 'Function error' });
  });
});
