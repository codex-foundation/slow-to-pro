import { fireEvent, render, waitFor } from '@testing-library/react-native';

import WebTabLayout from '../_layout.web';

const mockReplace = jest.fn();
const mockGetItem = jest.fn(() => null);
const mockGetSession = jest.fn();
let mockIsSupabaseConfigured = true;

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const Slot = () => React.createElement(React.Fragment, null);

  return {
    Slot,
    usePathname: () => '/tasks',
    useRouter: () => ({ replace: mockReplace }),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      React.createElement(Text, { testID: testID ?? 'mock-ionicon' }, 'icon'),
  };
});

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

jest.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  get supabase() {
    if (!mockIsSupabaseConfigured) return null;
    return { auth: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  },
}));

jest.mock('@/utils/mmkv', () => ({
  appStorage: { getItem: (...args: unknown[]) => mockGetItem(...args) },
}));

describe('WebTabLayout', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockIsSupabaseConfigured = true;
    mockGetItem.mockReturnValue(null);
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  });

  it('renders all four nav items when authenticated', async () => {
    const { getByText } = render(<WebTabLayout />);
    await waitFor(() => {
      expect(getByText('Tasks')).toBeTruthy();
      expect(getByText('Focus')).toBeTruthy();
      expect(getByText('Money')).toBeTruthy();
      expect(getByText('Settings')).toBeTruthy();
    });
  });

  it('renders the app logo in the sidebar when authenticated', async () => {
    const { getByText } = render(<WebTabLayout />);
    await waitFor(() => {
      expect(getByText('Slow to Pro')).toBeTruthy();
    });
  });

  it('redirects to / when there is no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<WebTabLayout />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to / when Supabase is not configured and T&C not accepted', async () => {
    mockIsSupabaseConfigured = false;
    mockGetItem.mockReturnValue(null);
    render(<WebTabLayout />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('renders sidebar when Supabase is not configured but T&C accepted', async () => {
    mockIsSupabaseConfigured = false;
    mockGetItem.mockReturnValue('true');
    const { getByText } = render(<WebTabLayout />);
    await waitFor(() => {
      expect(getByText('Tasks')).toBeTruthy();
    });
  });

  it('navigates to the correct route when a nav item is pressed', async () => {
    const { getByLabelText } = render(<WebTabLayout />);
    await waitFor(() => getByLabelText('Focus'));
    fireEvent.press(getByLabelText('Focus'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pomodoro');
  });

  it('navigates to Money route when pressed', async () => {
    const { getByLabelText } = render(<WebTabLayout />);
    await waitFor(() => getByLabelText('Money'));
    fireEvent.press(getByLabelText('Money'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/finances');
  });

  it('navigates to Settings route when pressed', async () => {
    const { getByLabelText } = render(<WebTabLayout />);
    await waitFor(() => getByLabelText('Settings'));
    fireEvent.press(getByLabelText('Settings'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/settings');
  });
});
