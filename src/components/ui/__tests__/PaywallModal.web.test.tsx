import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaywallModal } from '../PaywallModal.web';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreateCheckoutSession = jest.fn();
let mockIsStripeConfigured = false;

jest.mock('@/utils/stripe', () => ({
  createCheckoutSession: (...a: unknown[]) => mockCreateCheckoutSession(...a),
  isStripeConfigured: () => mockIsStripeConfigured,
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    danger: '#ef4444',
    success: '#10b981',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = ({ testID }: { testID?: string }) => React.createElement(View, { testID });
  Icon.displayName = 'MockIonicons';
  return Icon;
});

// Mock window.location for redirect tests
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '', origin: 'http://localhost:8081' },
});

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onUpgraded: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsStripeConfigured = false;
  window.location.href = '';
});

// ---------------------------------------------------------------------------
describe('PaywallModal (web)', () => {
  it('does not render anything when not visible', () => {
    const { queryByText } = render(
      <PaywallModal visible={false} onClose={jest.fn()} onUpgraded={jest.fn()} />
    );
    expect(queryByText('Upgrade to Pro')).toBeNull();
  });

  it('renders all Pro features', () => {
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    expect(getByText('Upgrade to Pro')).toBeTruthy();
    expect(getByText('Recurring tasks')).toBeTruthy();
    expect(getByText('Reminders')).toBeTruthy();
    expect(getByText('Cross-device cloud sync')).toBeTruthy();
    expect(getByText('Unlimited tasks & categories')).toBeTruthy();
    expect(getByText('Focus session history')).toBeTruthy();
  });

  it('shows Stripe not configured message when STRIPE_PRICE_ID is missing', () => {
    mockIsStripeConfigured = false;
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    expect(getByText(/EXPO_PUBLIC_STRIPE_PRICE_ID/)).toBeTruthy();
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={jest.fn()} />
    );
    fireEvent.press(getByTestId('paywall-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={jest.fn()} />
    );
    fireEvent.press(getByTestId('paywall-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('redirects to Stripe checkout URL on successful session creation', async () => {
    mockIsStripeConfigured = true;
    mockCreateCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' });

    const { getByTestId } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'http://localhost:8081/(tabs)/settings?pro=success',
      ''
    );
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/cs_test');
  });

  it('shows error message when checkout session creation fails', async () => {
    mockIsStripeConfigured = true;
    mockCreateCheckoutSession.mockResolvedValue({ url: null, error: 'Network error' });

    const { getByTestId, getByText } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    await waitFor(() => expect(getByText('Network error')).toBeTruthy());
  });

  it('shows fallback error message when checkout fails without message', async () => {
    mockIsStripeConfigured = true;
    mockCreateCheckoutSession.mockResolvedValue({ url: null });

    const { getByTestId, getByText } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    await waitFor(() => expect(getByText('Failed to start checkout.')).toBeTruthy());
  });

  it('shows ActivityIndicator while checkout is in progress', async () => {
    mockIsStripeConfigured = true;
    let resolveCheckout!: (v: { url: string }) => void;
    mockCreateCheckoutSession.mockReturnValue(
      new Promise((r) => {
        resolveCheckout = r;
      })
    );

    const { getByTestId, queryByText } = render(<PaywallModal {...defaultProps} />);

    act(() => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    // Text replaced by ActivityIndicator while busy
    expect(queryByText('Get Pro')).toBeNull();

    // Clean up
    await act(async () => {
      resolveCheckout({ url: 'https://checkout.stripe.com/pay/cs_test' });
    });
  });

  it('CTA button is disabled when Stripe is not configured', () => {
    mockIsStripeConfigured = false;
    const { getByTestId } = render(<PaywallModal {...defaultProps} />);
    // Pressing should be a no-op (disabled)
    fireEvent.press(getByTestId('paywall-cta'));
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });
});
