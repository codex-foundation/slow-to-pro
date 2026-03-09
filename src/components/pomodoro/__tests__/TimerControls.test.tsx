import { fireEvent, render } from '@testing-library/react-native';

import { TimerControls } from '../TimerControls';

const mockStart = jest.fn();
const mockPause = jest.fn();
const mockReset = jest.fn();
let mockStatus: 'idle' | 'running' = 'idle';

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

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: () => ({
    status: mockStatus,
    start: mockStart,
    pause: mockPause,
    reset: mockReset,
  }),
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

describe('TimerControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'idle';
  });

  it('shows text controls and START label when idle', () => {
    const { getByText } = render(<TimerControls />);

    expect(getByText('RESET')).toBeTruthy();
    expect(getByText('START')).toBeTruthy();
  });

  it('starts when primary button is pressed while idle', () => {
    const { getByTestId } = render(<TimerControls />);

    fireEvent.press(getByTestId('timer-primary-button'));

    expect(mockStart).toHaveBeenCalled();
    expect(mockPause).not.toHaveBeenCalled();
  });

  it('shows Pause mode and pauses when running', () => {
    mockStatus = 'running';
    const { getByText, getByTestId } = render(<TimerControls />);

    expect(getByText('PAUSE')).toBeTruthy();

    fireEvent.press(getByTestId('timer-primary-button'));

    expect(mockPause).toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('resets when reset button is pressed', () => {
    const { getByTestId } = render(<TimerControls />);

    fireEvent.press(getByTestId('timer-reset-button'));

    expect(mockReset).toHaveBeenCalled();
  });
});
