import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaywallModal } from '../PaywallModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPurchase = jest.fn();
const mockRestorePurchases = jest.fn();
let mockIsStripeConfigured = false;

jest.mock('@/utils/purchases', () => ({
  purchase: (...a: unknown[]) => mockPurchase(...a),
  restorePurchases: (...a: unknown[]) => mockRestorePurchases(...a),
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

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onUpgraded: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsStripeConfigured = false;
});

// ---------------------------------------------------------------------------
describe('PaywallModal', () => {
  it('does not render anything when not visible', () => {
    const { queryByText } = render(
      <PaywallModal visible={false} onClose={jest.fn()} onUpgraded={jest.fn()} />
    );
    expect(queryByText('Upgrade to Pro')).toBeNull();
  });

  it('shows Stripe not configured message when env vars missing', () => {
    mockIsStripeConfigured = false;
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    expect(getByText(/EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY/)).toBeTruthy();
  });

  it('shows Get Pro button when Stripe is configured', () => {
    mockIsStripeConfigured = true;
    const { getByTestId } = render(<PaywallModal {...defaultProps} />);
    expect(getByTestId('paywall-cta')).toBeTruthy();
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={jest.fn()} />
    );
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles purchase success: calls onUpgraded and onClose', async () => {
    mockIsStripeConfigured = true;
    mockPurchase.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onUpgraded = jest.fn();
    const { getByTestId } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={onUpgraded} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    expect(onUpgraded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error message when purchase fails', async () => {
    mockIsStripeConfigured = true;
    mockPurchase.mockResolvedValue({ success: false, error: 'Payment failed' });

    const { getByTestId, getByText } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    await waitFor(() => expect(getByText('Payment failed')).toBeTruthy());
  });

  it('handles silent failure (cancelled) without showing error', async () => {
    mockIsStripeConfigured = true;
    mockPurchase.mockResolvedValue({ success: false });

    const { getByTestId, queryByTestId } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    expect(queryByTestId('paywall-error')).toBeNull();
    expect(defaultProps.onUpgraded).not.toHaveBeenCalled();
  });

  it('handles restore success: calls onUpgraded and onClose', async () => {
    mockIsStripeConfigured = true;
    mockRestorePurchases.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onUpgraded = jest.fn();
    const { getByTestId } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={onUpgraded} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('paywall-restore'));
    });

    expect(onUpgraded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows fallback error when restore fails with no error message', async () => {
    mockIsStripeConfigured = true;
    mockRestorePurchases.mockResolvedValue({ success: false });

    const { getByTestId, getByText } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-restore'));
    });

    await waitFor(() =>
      expect(getByText('No active subscription found for this account.')).toBeTruthy()
    );
  });

  it('shows specific error when restore returns error message', async () => {
    mockIsStripeConfigured = true;
    mockRestorePurchases.mockResolvedValue({ success: false, error: 'Not found' });

    const { getByTestId, getByText } = render(<PaywallModal {...defaultProps} />);

    await act(async () => {
      fireEvent.press(getByTestId('paywall-restore'));
    });

    await waitFor(() => expect(getByText('Not found')).toBeTruthy());
  });

  it('shows ActivityIndicator while purchase is in progress', async () => {
    mockIsStripeConfigured = true;
    let resolvePurchase!: (v: { success: boolean }) => void;
    mockPurchase.mockReturnValue(
      new Promise((r) => {
        resolvePurchase = r;
      })
    );

    const { getByTestId, queryByText } = render(<PaywallModal {...defaultProps} />);

    act(() => {
      fireEvent.press(getByTestId('paywall-cta'));
    });

    expect(queryByText('Get Pro')).toBeNull();

    await act(async () => {
      resolvePurchase({ success: false });
    });
  });

  it('shows ActivityIndicator while restore is in progress', async () => {
    mockIsStripeConfigured = true;
    let resolveRestore!: (v: { success: boolean }) => void;
    mockRestorePurchases.mockReturnValue(
      new Promise((r) => {
        resolveRestore = r;
      })
    );

    const { getByTestId, queryByText } = render(<PaywallModal {...defaultProps} />);

    act(() => {
      fireEvent.press(getByTestId('paywall-restore'));
    });

    expect(queryByText('Restore purchases')).toBeNull();

    await act(async () => {
      resolveRestore({ success: false });
    });
  });
});
