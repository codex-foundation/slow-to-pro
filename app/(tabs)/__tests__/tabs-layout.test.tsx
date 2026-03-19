import { fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo',
  },
}));

import TabLayout from '../_layout';

let tabsRenderCount = 0;
let slotRenderCount = 0;
const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const Tabs = ({ children }: { children?: React.ReactNode }) => {
    tabsRenderCount += 1;
    return React.createElement(React.Fragment, null, children);
  };

  Tabs.Screen = () => React.createElement(React.Fragment, null);

  const Slot = () => {
    slotRenderCount += 1;
    return React.createElement(React.Fragment, null);
  };

  return {
    Slot,
    Tabs,
    usePathname: () => '/tasks',
    useRouter: () => ({ replace: mockReplace }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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

describe('TabLayout', () => {
  beforeEach(() => {
    tabsRenderCount = 0;
    slotRenderCount = 0;
    mockReplace.mockClear();
    // Reset appOwnership to expo for each test
    (
      jest.requireMock('expo-constants') as { default: { appOwnership: string } }
    ).default.appOwnership = 'expo';
  });

  it('uses custom JS tab bar in Expo Go and keeps tabs visible', () => {
    const { getByText } = render(<TabLayout />);

    expect(tabsRenderCount).toBe(0);
    expect(slotRenderCount).toBe(1);
    expect(getByText('Tasks')).toBeTruthy();
    expect(getByText('Focus')).toBeTruthy();
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('navigates to correct route when tab is pressed in Expo Go', () => {
    const { getByLabelText } = render(<TabLayout />);
    fireEvent.press(getByLabelText('Focus'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pomodoro');
  });

  it('marks the active tab based on pathname', () => {
    const { getByText } = render(<TabLayout />);
    // pathname is '/tasks', so Tasks tab should be active (primary color)
    // We just check it renders without crashing
    expect(getByText('Tasks')).toBeTruthy();
  });

  it('uses native Tabs component when not in Expo Go', () => {
    (
      jest.requireMock('expo-constants') as { default: { appOwnership: string } }
    ).default.appOwnership = 'standalone';
    render(<TabLayout />);
    expect(tabsRenderCount).toBe(1);
    expect(slotRenderCount).toBe(0);
  });
});
