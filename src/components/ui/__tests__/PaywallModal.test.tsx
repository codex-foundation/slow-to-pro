import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaywallModal } from '../PaywallModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetOfferings = jest.fn();
const mockPurchasePackage = jest.fn();
const mockRestorePurchases = jest.fn();
let mockIsRcConfigured = false;

jest.mock('@/utils/purchases', () => ({
  getOfferings: (...a: unknown[]) => mockGetOfferings(...a),
  purchasePackage: (...a: unknown[]) => mockPurchasePackage(...a),
  restorePurchases: (...a: unknown[]) => mockRestorePurchases(...a),
  isRevenueCatConfigured: () => mockIsRcConfigured,
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

function makePkg(id: string, title = 'Pro Monthly', price = '$4.99') {
  return {
    identifier: id,
    product: { title, description: 'Full access', priceString: price },
  };
}

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onUpgraded: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIsRcConfigured = false;
  mockGetOfferings.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
describe('PaywallModal', () => {
  it('does not render anything when not visible', () => {
    const { queryByText } = render(
      <PaywallModal visible={false} onClose={jest.fn()} onUpgraded={jest.fn()} />
    );
    expect(queryByText('Upgrade to Pro')).toBeNull();
  });

  it('shows RC not configured message when RC is not configured', async () => {
    mockIsRcConfigured = false;
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    await waitFor(() => {
      expect(getByText(/EXPO_PUBLIC_REVENUECAT_API_KEY_IOS/)).toBeTruthy();
    });
  });

  it('shows loading indicator when RC is configured and loading', async () => {
    mockIsRcConfigured = true;
    // Keep getOfferings pending so loading state persists
    mockGetOfferings.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    expect(getByText('Upgrade to Pro')).toBeTruthy();
    // ActivityIndicator is shown (loading=true)
  });

  it('shows no offerings message when offering is empty', async () => {
    mockIsRcConfigured = true;
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('No offerings available right now.')).toBeTruthy();
    });
  });

  it('shows packages when offerings are available', async () => {
    mockIsRcConfigured = true;
    const pkg = makePkg('monthly');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg] });
    const { getByText } = render(<PaywallModal {...defaultProps} />);
    await waitFor(() => {
      expect(getByText('Pro Monthly')).toBeTruthy();
    });
  });

  it('calls onClose when backdrop is pressed', async () => {
    const onClose = jest.fn();
    mockGetOfferings.mockResolvedValue(null);
    const { UNSAFE_getAllByType } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={jest.fn()} />
    );
    // First TouchableOpacity is the backdrop
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={jest.fn()} />
    );
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Second TouchableOpacity is the close X button
    fireEvent.press(touchables[1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles purchase success: calls onUpgraded and onClose', async () => {
    mockIsRcConfigured = true;
    const pkg = makePkg('monthly');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg] });
    mockPurchasePackage.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onUpgraded = jest.fn();
    const { getByText } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={onUpgraded} />
    );

    await waitFor(() => expect(getByText('Pro Monthly')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText(/Get Pro/));
    });

    expect(onUpgraded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error message when purchase fails with error', async () => {
    mockIsRcConfigured = true;
    const pkg = makePkg('monthly');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg] });
    mockPurchasePackage.mockResolvedValue({ success: false, error: 'Payment failed' });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('Pro Monthly')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText(/Get Pro/));
    });

    await waitFor(() => expect(getByText('Payment failed')).toBeTruthy());
  });

  it('handles purchase failure without error message (silent failure)', async () => {
    mockIsRcConfigured = true;
    const pkg = makePkg('monthly');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg] });
    mockPurchasePackage.mockResolvedValue({ success: false });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('Pro Monthly')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText(/Get Pro/));
    });

    // No error message shown
    expect(defaultProps.onUpgraded).not.toHaveBeenCalled();
  });

  it('handles restore success: calls onUpgraded and onClose', async () => {
    mockIsRcConfigured = true;
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });
    mockRestorePurchases.mockResolvedValue({ success: true });

    const onClose = jest.fn();
    const onUpgraded = jest.fn();
    const { getByText } = render(
      <PaywallModal visible={true} onClose={onClose} onUpgraded={onUpgraded} />
    );

    await waitFor(() => expect(getByText('No offerings available right now.')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Restore purchases'));
    });

    expect(onUpgraded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when restore fails with no error message', async () => {
    mockIsRcConfigured = true;
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });
    mockRestorePurchases.mockResolvedValue({ success: false });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('No offerings available right now.')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Restore purchases'));
    });

    await waitFor(() =>
      expect(getByText('No previous purchases found for this account.')).toBeTruthy()
    );
  });

  it('shows specific error when restore returns error message', async () => {
    mockIsRcConfigured = true;
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });
    mockRestorePurchases.mockResolvedValue({ success: false, error: 'Not found' });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('No offerings available right now.')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Restore purchases'));
    });

    await waitFor(() => expect(getByText('Not found')).toBeTruthy());
  });

  it('selecting a package updates selected state', async () => {
    mockIsRcConfigured = true;
    const pkg1 = makePkg('monthly', 'Monthly', '$4.99');
    const pkg2 = makePkg('annual', 'Annual', '$39.99');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg1, pkg2] });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('Monthly')).toBeTruthy());

    fireEvent.press(getByText('Annual'));
    expect(getByText(/Get Pro · \$39.99/)).toBeTruthy();
  });

  it('handlePurchase returns early when no package is selected', async () => {
    mockIsRcConfigured = true;
    // Return no packages so selected=null
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });

    const { getByText } = render(<PaywallModal {...defaultProps} />);

    await waitFor(() => expect(getByText('No offerings available right now.')).toBeTruthy());

    // Press Get Pro with no selection — should not call purchasePackage
    fireEvent.press(getByText('Get Pro'));
    expect(mockPurchasePackage).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator while purchase is in progress', async () => {
    mockIsRcConfigured = true;
    const pkg = makePkg('monthly');
    mockGetOfferings.mockResolvedValue({ availablePackages: [pkg] });
    // Keep purchase pending so busy=true state is observable
    let resolvePurchase!: (v: { success: boolean }) => void;
    mockPurchasePackage.mockReturnValue(
      new Promise((r) => {
        resolvePurchase = r;
      })
    );

    const { getByText, queryByText } = render(<PaywallModal {...defaultProps} />);
    await waitFor(() => expect(getByText('Pro Monthly')).toBeTruthy());

    act(() => {
      fireEvent.press(getByText(/Get Pro/));
    });

    // While busy, ActivityIndicator replaces the text
    expect(queryByText(/Get Pro/)).toBeNull();

    // Clean up
    await act(async () => {
      resolvePurchase({ success: false });
    });
  });

  it('shows ActivityIndicator while restore is in progress', async () => {
    mockIsRcConfigured = true;
    mockGetOfferings.mockResolvedValue({ availablePackages: [] });
    let resolveRestore!: (v: { success: boolean }) => void;
    mockRestorePurchases.mockReturnValue(
      new Promise((r) => {
        resolveRestore = r;
      })
    );

    const { getByText, queryByText } = render(<PaywallModal {...defaultProps} />);
    await waitFor(() => expect(getByText('No offerings available right now.')).toBeTruthy());

    act(() => {
      fireEvent.press(getByText('Restore purchases'));
    });

    // While restoring, Restore text is replaced by ActivityIndicator
    expect(queryByText('Restore purchases')).toBeNull();

    // Clean up
    await act(async () => {
      resolveRestore({ success: false });
    });
  });
});
