import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AuthScreen from '../index';

const mockReplace = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

// --- expo-router ---
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// --- safe-area ---
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  };
});

// --- Ionicons ---
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ testID, name }: { testID?: string; name?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name ?? 'icon'),
  };
});

// --- MMKV storage ---
jest.mock('@/utils/mmkv', () => ({
  appStorage: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

// --- Theme ---
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

// --- Supabase ---
const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
    },
  },
}));

// --- Cloud sync ---
const mockSyncFromCloudOrSeed = jest.fn();
jest.mock('@/services/cloudSync', () => ({
  syncFromCloudOrSeed: (...args: unknown[]) => mockSyncFromCloudOrSeed(...args),
}));

// --- Biometrics ---
const mockIsBiometricAvailable = jest.fn();
const mockAuthenticateWithBiometrics = jest.fn();
jest.mock('@/utils/biometrics', () => ({
  isBiometricAvailable: () => mockIsBiometricAvailable(),
  authenticateWithBiometrics: (...args: unknown[]) => mockAuthenticateWithBiometrics(...args),
}));

// --- expo-linking ---
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `slow-to-pro://${path}`,
  parse: (url: string) => ({ queryParams: { code: 'test-code' }, url }),
}));

// --- expo-web-browser ---
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReturnValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockIsBiometricAvailable.mockResolvedValue(false);
  });

  it('redirects legacy users who have already seen welcome', async () => {
    mockGetItem.mockImplementation((key: string) =>
      key === 'has-seen-welcome-v1' ? 'true' : null
    );
    render(<AuthScreen />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('redirects when a Supabase session already exists (no biometrics)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(<AuthScreen />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('shows the login form after loading when no session', async () => {
    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => {
      expect(getByTestId('auth-email-input')).toBeTruthy();
      expect(getByTestId('auth-password-input')).toBeTruthy();
      expect(getByTestId('login-button')).toBeTruthy();
    });
  });

  it('shows Google and Apple login buttons', async () => {
    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => {
      expect(getByTestId('google-login-button')).toBeTruthy();
      expect(getByTestId('apple-login-button')).toBeTruthy();
    });
  });

  it('shows Face ID button when biometrics are available', async () => {
    mockIsBiometricAvailable.mockResolvedValue(true);
    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => {
      expect(getByTestId('biometric-login-button')).toBeTruthy();
    });
  });

  it('hides Face ID button when biometrics are unavailable', async () => {
    mockIsBiometricAvailable.mockResolvedValue(false);
    const { queryByTestId } = render(<AuthScreen />);
    await waitFor(() => {
      expect(queryByTestId('biometric-login-button')).toBeNull();
    });
  });

  it('Face ID success navigates to tabs', async () => {
    mockIsBiometricAvailable.mockResolvedValue(true);
    mockAuthenticateWithBiometrics.mockResolvedValue(true);
    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => getByTestId('biometric-login-button'));
    fireEvent.press(getByTestId('biometric-login-button'));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('Face ID failure shows error message', async () => {
    mockIsBiometricAvailable.mockResolvedValue(true);
    mockAuthenticateWithBiometrics.mockResolvedValue(false);
    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => getByTestId('biometric-login-button'));
    fireEvent.press(getByTestId('biometric-login-button'));
    await waitFor(() => {
      expect(getByTestId('auth-status-message')).toBeTruthy();
    });
  });

  it('login calls signInWithPassword, syncs, and navigates', async () => {
    const fakeUser = { id: 'u1' };
    mockSignInWithPassword.mockResolvedValue({ data: { user: fakeUser }, error: null });
    mockSyncFromCloudOrSeed.mockResolvedValue(undefined);

    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => getByTestId('auth-email-input'));

    fireEvent.changeText(getByTestId('auth-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockSyncFromCloudOrSeed).toHaveBeenCalledWith('u1');
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('shows error message on login failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials' },
    });

    const { getByTestId } = render(<AuthScreen />);
    await waitFor(() => getByTestId('auth-email-input'));

    fireEvent.changeText(getByTestId('auth-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('auth-password-input'), 'wrongpassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByTestId('auth-status-message')).toBeTruthy();
    });
  });

  it('toggle button switches between login and register', async () => {
    const { getByTestId, queryByTestId } = render(<AuthScreen />);
    await waitFor(() => getByTestId('login-button'));

    expect(queryByTestId('signup-button')).toBeNull();
    fireEvent.press(getByTestId('toggle-auth-mode'));

    await waitFor(() => {
      expect(getByTestId('signup-button')).toBeTruthy();
      expect(queryByTestId('login-button')).toBeNull();
    });
  });
});
