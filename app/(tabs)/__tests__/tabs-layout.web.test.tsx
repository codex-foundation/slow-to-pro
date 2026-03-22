import { fireEvent, render } from '@testing-library/react-native';

import WebTabLayout from '../_layout.web';

const mockReplace = jest.fn();

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

describe('WebTabLayout', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders all four nav items', () => {
    const { getByText } = render(<WebTabLayout />);
    expect(getByText('Tasks')).toBeTruthy();
    expect(getByText('Focus')).toBeTruthy();
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('renders the app logo/name in the sidebar', () => {
    const { getByText } = render(<WebTabLayout />);
    expect(getByText('Slow to Pro')).toBeTruthy();
  });

  it('navigates to the correct route when a nav item is pressed', () => {
    const { getByLabelText } = render(<WebTabLayout />);
    fireEvent.press(getByLabelText('Focus'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pomodoro');
  });

  it('navigates to Money route when pressed', () => {
    const { getByLabelText } = render(<WebTabLayout />);
    fireEvent.press(getByLabelText('Money'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/finances');
  });

  it('navigates to Settings route when pressed', () => {
    const { getByLabelText } = render(<WebTabLayout />);
    fireEvent.press(getByLabelText('Settings'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('renders without crashing (does not use Tabs or Expo Go custom bar)', () => {
    const { getByText } = render(<WebTabLayout />);
    expect(getByText('Tasks')).toBeTruthy();
  });
});
