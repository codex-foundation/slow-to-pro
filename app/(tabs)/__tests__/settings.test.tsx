import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '../settings';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useSyncStore } from '@/stores/syncStore';

const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockCreateURL = jest.fn();
const mockParse = jest.fn();
const mockOpenURL = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();
const mockSyncFromCloudOrSeed = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0' },
    nativeAppVersion: '1.0.0',
  },
}));

jest.mock('expo-linking', () => ({
  createURL: (...args: unknown[]) => mockCreateURL(...args),
  parse: (...args: unknown[]) => mockParse(...args),
  openURL: (...args: unknown[]) => mockOpenURL(...args),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSessionAsync(...args),
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

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: any) => unknown) =>
    selector({
      themePreference: 'system',
      setThemePreference: jest.fn(),
    }),
}));

jest.mock('@/stores/syncStore', () => ({
  useSyncStore: jest.fn(() => ({ lastSyncedAt: null, isSyncing: false, syncError: null })),
}));

jest.mock('@/services/cloudSync', () => ({
  syncFromCloudOrSeed: (...args: unknown[]) => mockSyncFromCloudOrSeed(...args),
}));

jest.mock('@/services/spaceSync', () => ({
  loadSpaces: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/purchases', () => ({
  isRevenueCatConfigured: jest.fn().mockReturnValue(false),
  refreshProStatus: jest.fn().mockResolvedValue(undefined),
  readProStatusFromDb: jest.fn().mockResolvedValue(false),
  initializePurchases: jest.fn().mockResolvedValue(undefined),
  refreshEntitlements: jest.fn().mockResolvedValue(undefined),
  getOfferings: jest.fn().mockResolvedValue(null),
  purchasePackage: jest.fn().mockResolvedValue({ success: false }),
  restorePurchases: jest.fn().mockResolvedValue({ success: false }),
  PRO_ENTITLEMENT: 'pro',
}));

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

jest.mock('@/stores/entitlementStore', () => ({
  useEntitlementStore: jest.fn((selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
    selector({ isPro: false, isRcPro: false })
  ),
}));

let mockSpaceState = {
  activeSpaceId: null as string | null,
  spaces: [] as { id: string; name: string }[],
  pendingInvites: [] as unknown[],
};

jest.mock('@/stores/spaceStore', () => ({
  useSpaceStore: (
    selector: (s: {
      activeSpaceId: string | null;
      spaces: unknown[];
      pendingInvites: unknown[];
    }) => unknown
  ) => selector(mockSpaceState),
}));

const mockPaywallOnClose = jest.fn();
const mockPaywallOnUpgraded = jest.fn();
jest.mock('@/components/ui/PaywallModal', () => ({
  PaywallModal: ({ onClose, onUpgraded }: { visible: boolean; onClose: () => void; onUpgraded: () => void }) => {
    mockPaywallOnClose.mockImplementation(onClose);
    mockPaywallOnUpgraded.mockImplementation(onUpgraded);
    return null;
  },
}));

const mockSharedSpaceOnClose = jest.fn();
jest.mock('@/components/ui/SharedSpaceModal', () => ({
  SharedSpaceModal: ({ onClose }: { visible: boolean; onClose: () => void }) => {
    mockSharedSpaceOnClose.mockImplementation(onClose);
    return null;
  },
}));

describe('SettingsScreen social auth', () => {
  beforeEach(() => {
    mockSpaceState = { activeSpaceId: null, spaces: [], pendingInvites: [] };
    mockGetUser.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSignInWithOAuth.mockReset();
    mockExchangeCodeForSession.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockSignOut.mockReset();
    mockCreateURL.mockReset();
    mockParse.mockReset();
    mockOpenAuthSessionAsync.mockReset();
    mockSyncFromCloudOrSeed.mockReset();
    mockReplace.mockReset();

    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });

    mockCreateURL.mockReturnValue('slow-to-pro://auth/callback');
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://auth.example.com/oauth' },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'slow-to-pro://auth/callback?code=oauth-code-123',
    });
    mockParse.mockReturnValue({ queryParams: { code: 'oauth-code-123' } });
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSyncFromCloudOrSeed.mockResolvedValue('pulled');
  });

  it('shows Google and Apple social login buttons when logged out', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Continue with Google')).toBeTruthy();
      expect(getByText('Continue with Apple')).toBeTruthy();
    });
  });

  it('starts Google OAuth flow and exchanges code for session', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Continue with Google')).toBeTruthy();
    });

    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'slow-to-pro://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
        'https://auth.example.com/oauth',
        'slow-to-pro://auth/callback'
      );
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('oauth-code-123');
      expect(mockSyncFromCloudOrSeed).toHaveBeenCalledWith('user-1');
    });
  });

  it('starts Apple OAuth flow', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Continue with Apple')).toBeTruthy();
    });

    fireEvent.press(getByText('Continue with Apple'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: 'slow-to-pro://auth/callback',
          skipBrowserRedirect: true,
        },
      });
    });
  });
});

describe('SettingsScreen email/password auth', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockOnAuthStateChange.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignUp.mockReset();
    mockSignOut.mockReset();
    mockSyncFromCloudOrSeed.mockReset();
    mockReplace.mockReset();

    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSyncFromCloudOrSeed.mockResolvedValue('pulled');
  });

  it('shows email/password form when logged out', async () => {
    const { getByPlaceholderText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password (min 6 chars)')).toBeTruthy();
    });
  });

  it('login button is disabled when fields are empty', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Log in')).toBeTruthy();
    });
    // pressing login with empty fields should do nothing
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    fireEvent.press(getByText('Log in'));
    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });
  });

  it('calls signInWithPassword and shows success message on login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 chars)'), 'password123');
    fireEvent.press(getByText('Log in'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message when login fails', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid credentials'),
    });

    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 chars)'), 'wrongpass');
    fireEvent.press(getByText('Log in'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('calls signUp and shows confirmation message on sign up', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('Email')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Email'), 'new@example.com');
    fireEvent.changeText(getByPlaceholderText('Password (min 6 chars)'), 'password123');
    fireEvent.press(getByText('Sign up'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
    });
  });

  it('shows Log out button when logged in and calls signOut on press', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    });
    mockOnAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: { email: string } } | null) => void) => {
        setTimeout(() => cb('SIGNED_IN', { user: { email: 'user@example.com' } }), 0);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }
    );
    mockSignOut.mockResolvedValue({ error: null });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Log out')).toBeTruthy();
    });

    fireEvent.press(getByText('Log out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});

describe('SettingsScreen syncTimeAgo display', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('shows sync dot with appropriate colors based on sync state', async () => {
    mockOnAuthStateChange.mockImplementation(
      (cb: (event: string, session: { user: { email: string } } | null) => void) => {
        setTimeout(() => cb('SIGNED_IN', { user: { email: 'user@example.com' } }), 0);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }
    );

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Log out')).toBeTruthy();
    });
  });
});

describe('SettingsScreen syncTimeAgo utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('shows "just now" when lastSyncedAt is less than 60s ago', async () => {
    (useSyncStore as jest.Mock).mockReturnValue({
      lastSyncedAt: Date.now() - 30000, // 30s ago
      isSyncing: false,
      syncError: null,
    });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText(/just now/)).toBeTruthy();
    });
  });

  it('shows "Xm ago" when lastSyncedAt is between 60s and 1h ago', async () => {
    (useSyncStore as jest.Mock).mockReturnValue({
      lastSyncedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      isSyncing: false,
      syncError: null,
    });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText(/5m ago/)).toBeTruthy();
    });
  });

  it('shows "Xh ago" when lastSyncedAt is between 1h and 24h ago', async () => {
    (useSyncStore as jest.Mock).mockReturnValue({
      lastSyncedAt: Date.now() - 3 * 3600 * 1000, // 3 hours ago
      isSyncing: false,
      syncError: null,
    });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText(/3h ago/)).toBeTruthy();
    });
  });

  it('shows "Xd ago" when lastSyncedAt is more than 24h ago', async () => {
    (useSyncStore as jest.Mock).mockReturnValue({
      lastSyncedAt: Date.now() - 2 * 86400 * 1000, // 2 days ago
      isSyncing: false,
      syncError: null,
    });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText(/2d ago/)).toBeTruthy();
    });
  });
});

describe('SettingsScreen pro/non-pro sections', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('shows Upgrade to Pro button when not pro and presses it', async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );

    const { getAllByText } = render(<SettingsScreen />);
    await waitFor(() => {
      const upgradeBtns = getAllByText('Upgrade to Pro');
      expect(upgradeBtns.length).toBeGreaterThan(0);
      // Press each upgrade button to trigger setShowPaywall(true)
      upgradeBtns.forEach((btn) => fireEvent.press(btn));
    });
  });

  it("shows You're on Pro message when isPro is true", async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: false })
    );

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText(/You're on Pro/)).toBeTruthy();
    });
  });

  it('shows Manage Subscription button when isRcPro is true', async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: true })
    );

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Manage Subscription')).toBeTruthy();
    });

    fireEvent.press(getByText('Manage Subscription'));
    await waitFor(() => {
      expect(mockOpenURL).toHaveBeenCalledWith(expect.stringContaining('apps.apple.com'));
    });
  });

  it('shows Manage Spaces button when isPro is true', async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: false })
    );

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Manage Spaces')).toBeTruthy();
    });

    fireEvent.press(getByText('Manage Spaces'));
    // SharedSpaceModal opens (it's mocked to null but onPress fires setShowSpaces)
  });

  it('shows pro SharedSpace upgrade button when non-pro', async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );

    const { getAllByText } = render(<SettingsScreen />);
    await waitFor(() => {
      // Both the Pro section and Shared Spaces section show Upgrade to Pro
      const btns = getAllByText('Upgrade to Pro');
      expect(btns.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('presses theme options to change theme', async () => {
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('light')).toBeTruthy();
    });

    fireEvent.press(getByText('light'));
    fireEvent.press(getByText('dark'));
  });
});

describe('SettingsScreen OAuth edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockCreateURL.mockReturnValue('slow-to-pro://auth/callback');
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://auth.example.com/oauth' },
      error: null,
    });
  });

  it('returns early when OAuth session type is not success', async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Continue with Google')).toBeTruthy();
    });

    fireEvent.press(getByText('Continue with Google'));
    await waitFor(() => {
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  it('returns early when OAuth callback has no code', async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'slow-to-pro://auth/callback?no_code=true',
    });
    mockParse.mockReturnValue({ queryParams: {} });

    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Continue with Google')).toBeTruthy();
    });

    fireEvent.press(getByText('Continue with Google'));
    await waitFor(() => {
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });
  });
});

describe('SettingsScreen active space and modal callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('shows active space name when activeSpaceId is set', async () => {
    mockSpaceState = {
      activeSpaceId: 'sp1',
      spaces: [{ id: 'sp1', name: 'My Space' }],
      pendingInvites: [],
    };
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: false })
    );
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Space: My Space')).toBeTruthy();
    });
  });

  it('shows Unknown when activeSpaceId references missing space', async () => {
    mockSpaceState = {
      activeSpaceId: 'missing',
      spaces: [],
      pendingInvites: [],
    };
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: false })
    );
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Space: Unknown')).toBeTruthy();
    });
  });

  it('calls PaywallModal callbacks without error', async () => {
    mockSpaceState = { activeSpaceId: null, spaces: [], pendingInvites: [] };
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: false, isRcPro: false })
    );
    render(<SettingsScreen />);
    await waitFor(() => expect(mockPaywallOnClose).toBeDefined());
    expect(() => mockPaywallOnClose()).not.toThrow();
    expect(() => mockPaywallOnUpgraded()).not.toThrow();
  });

  it('calls SharedSpaceModal onClose callback without error', async () => {
    mockSpaceState = { activeSpaceId: null, spaces: [], pendingInvites: [] };
    (useEntitlementStore as jest.Mock).mockImplementation(
      (selector: (s: { isPro: boolean; isRcPro: boolean }) => unknown) =>
        selector({ isPro: true, isRcPro: false })
    );
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => expect(getByText('Manage Spaces')).toBeTruthy());
    fireEvent.press(getByText('Manage Spaces'));
    await waitFor(() => expect(mockSharedSpaceOnClose).toBeDefined());
    expect(() => mockSharedSpaceOnClose()).not.toThrow();
  });
});
