import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '../settings';

const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockCreateURL = jest.fn();
const mockParse = jest.fn();
const mockOpenAuthSessionAsync = jest.fn();
const mockSyncFromCloudOrSeed = jest.fn();
const mockPullCloudSnapshot = jest.fn();
const mockPushCloudSnapshot = jest.fn();
const mockApplySnapshot = jest.fn();

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

jest.mock('@/services/cloudSync', () => ({
  applySnapshot: (...args: unknown[]) => mockApplySnapshot(...args),
  pullCloudSnapshot: (...args: unknown[]) => mockPullCloudSnapshot(...args),
  pushCloudSnapshot: (...args: unknown[]) => mockPushCloudSnapshot(...args),
  syncFromCloudOrSeed: (...args: unknown[]) => mockSyncFromCloudOrSeed(...args),
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

describe('SettingsScreen social auth', () => {
  beforeEach(() => {
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
    mockPullCloudSnapshot.mockReset();
    mockPushCloudSnapshot.mockReset();
    mockApplySnapshot.mockReset();

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
