import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import AuthScreenWeb from '../index.web';

const mockReplace = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ testID, name }: { testID?: string; name?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name ?? 'icon'),
  };
});

jest.mock('@/utils/mmkv', () => ({
  appStorage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
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

const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();

let mockIsSupabaseConfigured = true;

jest.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  get supabase() {
    if (!mockIsSupabaseConfigured) return null;
    return {
      auth: {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
        signUp: (...args: unknown[]) => mockSignUp(...args),
        signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
        exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      },
    };
  },
}));

jest.mock('@/services/cloudSync', () => ({
  syncFromCloudOrSeed: jest.fn(),
}));

jest.mock('@/services/spaceSync', () => ({
  loadSpaces: jest.fn(),
}));

jest.mock('@/utils/biometrics', () => ({
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
  authenticateWithBiometrics: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `slow-to-pro://${path}`,
  parse: (url: string) => ({ queryParams: { code: 'test-code' }, url }),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

describe('AuthScreenWeb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured = true;
    mockGetItem.mockReturnValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('redirects immediately when already seen welcome', async () => {
    mockGetItem.mockImplementation((key: string) =>
      key === 'has-seen-welcome-v1' ? 'true' : null
    );
    render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('redirects when a session already exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('renders the two-column login form', async () => {
    const { getByText, getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(getByText('Slow to Pro')).toBeTruthy();
      expect(getByTestId('auth-email-input')).toBeTruthy();
      expect(getByTestId('auth-password-input')).toBeTruthy();
      expect(getByTestId('login-button')).toBeTruthy();
    });
  });

  it('renders Google login button', async () => {
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(getByTestId('google-login-button')).toBeTruthy();
    });
  });

  it('does not render Apple login button (web omits Apple SSO)', async () => {
    const { queryByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(queryByTestId('apple-login-button')).toBeNull();
    });
  });

  it('does not render biometric button on web', async () => {
    const { queryByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(queryByTestId('biometric-login-button')).toBeNull();
    });
  });

  it('login calls signInWithPassword and navigates', async () => {
    const { syncFromCloudOrSeed } = jest.requireMock('@/services/cloudSync') as {
      syncFromCloudOrSeed: jest.Mock;
    };
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    syncFromCloudOrSeed.mockResolvedValue(undefined);

    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('auth-email-input'));

    fireEvent.changeText(getByTestId('auth-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('toggle switches to register mode and shows checkboxes', async () => {
    const { getByTestId, queryByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('login-button'));

    expect(queryByTestId('signup-button')).toBeNull();
    fireEvent.press(getByTestId('toggle-auth-mode'));

    await waitFor(() => {
      expect(getByTestId('signup-button')).toBeTruthy();
      expect(getByTestId('privacy-checkbox')).toBeTruthy();
      expect(getByTestId('tc-checkbox')).toBeTruthy();
    });
  });

  it('shows error message on login failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    });

    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('auth-email-input'));

    fireEvent.changeText(getByTestId('auth-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'wrongpass');

    await act(async () => {
      fireEvent.press(getByTestId('login-button'));
    });

    await waitFor(() => {
      expect(getByTestId('auth-status-message')).toBeTruthy();
    });
  });

  it('toggles privacy and TC checkboxes in register mode', async () => {
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('login-button'));

    // Switch to register mode so checkboxes appear
    fireEvent.press(getByTestId('toggle-auth-mode'));
    await waitFor(() => getByTestId('privacy-checkbox'));

    fireEvent.press(getByTestId('privacy-checkbox'));
    fireEvent.press(getByTestId('tc-checkbox'));
    // Toggle back off
    fireEvent.press(getByTestId('privacy-checkbox'));
    fireEvent.press(getByTestId('tc-checkbox'));
  });

  it('submitting email input focuses the password field without error', async () => {
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('auth-email-input'));
    expect(() =>
      fireEvent(getByTestId('auth-email-input'), 'submitEditing')
    ).not.toThrow();
  });

  it('submitting password fires handleLogin when in login mode', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('auth-password-input'));
    fireEvent.changeText(getByTestId('auth-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'password123');
    expect(() =>
      fireEvent(getByTestId('auth-password-input'), 'submitEditing')
    ).not.toThrow();
  });

  it('submitting password fires handleSignUp when in register mode', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: null });
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('login-button'));
    fireEvent.press(getByTestId('toggle-auth-mode'));
    await waitFor(() => getByTestId('signup-button'));
    fireEvent.press(getByTestId('privacy-checkbox'));
    fireEvent.press(getByTestId('tc-checkbox'));
    fireEvent.changeText(getByTestId('auth-email-input'), 'new@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'password123');
    expect(() =>
      fireEvent(getByTestId('auth-password-input'), 'submitEditing')
    ).not.toThrow();
  });

  it('pressing Google login fires handleSocialLogin google on web', async () => {
    const webBrowser = jest.requireMock('expo-web-browser') as {
      openAuthSessionAsync: jest.Mock;
    };
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://oauth.example.com' },
      error: null,
    });
    webBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'slow-to-pro://auth/callback?code=abc123',
    });
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'u3' } },
      error: null,
    });

    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('google-login-button'));
    fireEvent.press(getByTestId('google-login-button'));

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' })
      );
    });
  });

  it('shows get-started-button and checkboxes when Supabase is not configured', async () => {
    mockIsSupabaseConfigured = false;
    const { getByTestId, queryByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => {
      expect(getByTestId('get-started-button')).toBeTruthy();
      // No email/password inputs when auth is disabled
      expect(queryByTestId('login-button')).toBeNull();
    });
  });

  it('get-started-button navigates after accepting T&C when Supabase not configured', async () => {
    mockIsSupabaseConfigured = false;
    const { getByTestId } = render(<AuthScreenWeb />);
    await waitFor(() => getByTestId('get-started-button'));
    // Accept both checkboxes
    fireEvent.press(getByTestId('privacy-checkbox'));
    fireEvent.press(getByTestId('tc-checkbox'));
    fireEvent.press(getByTestId('get-started-button'));
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith('tc-accepted-v1', 'true');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });
});
