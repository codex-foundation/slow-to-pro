import { fireEvent, render, waitFor } from '@testing-library/react-native';

import WelcomeScreen from '../index';

const mockReplace = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
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

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockGetItem.mockClear();
    mockSetItem.mockClear();
    mockGetItem.mockReturnValue(null);
  });

  it('renders welcome title and action button', () => {
    const { getByText, getByTestId } = render(<WelcomeScreen />);

    expect(getByText('Slow to Pro')).toBeTruthy();
    expect(getByText('Get started')).toBeTruthy();
    expect(getByTestId('welcome-wave-icon')).toBeTruthy();
  });

  it('navigates to tabs when welcome was already seen', async () => {
    mockGetItem.mockReturnValue('true');

    render(<WelcomeScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  it('stores flag and navigates when get started is pressed', () => {
    const { getByText } = render(<WelcomeScreen />);

    fireEvent.press(getByText('Get started'));

    expect(mockSetItem).toHaveBeenCalledWith('has-seen-welcome-v1', 'true');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/tasks');
  });
});
