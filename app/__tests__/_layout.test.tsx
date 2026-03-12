import { render } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockAppStateRemove = jest.fn();
const mockAppStateAddEventListener = jest.fn(
  (_eventType: string, _listener: (state: string) => void) => ({
    remove: mockAppStateRemove,
  })
);

jest.mock('../../global.css', () => ({}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo',
  },
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  const MockIonicons = ({ testID }: { testID?: string }) =>
    React.createElement(Text, { testID: testID ?? 'mock-ionicon' }, 'icon');

  (MockIonicons as unknown as { font: Record<string, unknown> }).font = {
    ionicons: 'mock-ionicons-font',
  };

  return {
    __esModule: true,
    default: MockIonicons,
  };
});

import RootLayout from '../_layout';

let capturedScreenOptions: Record<string, unknown> | undefined;
let stackRenderCount = 0;
let slotRenderCount = 0;

jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    Stack: ({ screenOptions }: { screenOptions?: Record<string, unknown> }) => {
      stackRenderCount += 1;
      capturedScreenOptions = screenOptions;
      return React.createElement(React.Fragment, null);
    },
    Slot: () => {
      slotRenderCount += 1;
      return React.createElement(React.Fragment, null);
    },
  };
});

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@/components/ui/WebNotificationFallbackToast', () => ({
  WebNotificationFallbackToast: () => null,
}));

const mockResetRecurringTasksIfNewDay = jest.fn();
const mockReconcileRunningTimer = jest.fn();
const mockPullForCurrentUser = jest.fn(async () => false);
const mockPushForCurrentUser = jest.fn(async () => false);

jest.mock('@/stores/taskStore', () => ({
  useTaskStore: {
    getState: () => ({
      resetRecurringTasksIfNewDay: mockResetRecurringTasksIfNewDay,
    }),
  },
}));

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: {
    getState: () => ({
      reconcileRunningTimer: mockReconcileRunningTimer,
    }),
  },
}));

jest.mock('@/services/cloudSync', () => ({
  pullForCurrentUser: () => mockPullForCurrentUser(),
  pushForCurrentUser: () => mockPushForCurrentUser(),
}));

describe('RootLayout', () => {
  let appStateAddEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    appStateAddEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((eventType, listener) =>
        mockAppStateAddEventListener(eventType as string, listener as (state: string) => void)
      );

    capturedScreenOptions = undefined;
    stackRenderCount = 0;
    slotRenderCount = 0;
    mockAppStateAddEventListener.mockClear();
    mockAppStateRemove.mockClear();
    mockResetRecurringTasksIfNewDay.mockClear();
    mockReconcileRunningTimer.mockClear();
    mockPullForCurrentUser.mockClear();
    mockPushForCurrentUser.mockClear();
  });

  afterEach(() => {
    appStateAddEventListenerSpy.mockRestore();
  });

  it('renders app immediately', () => {
    render(<RootLayout />);

    expect(slotRenderCount).toBe(1);
    expect(stackRenderCount).toBe(0);
    expect(mockReconcileRunningTimer).toHaveBeenCalledTimes(1);
    expect(mockPullForCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('uses Slot in Expo Go to avoid native stack host-function issues', () => {
    render(<RootLayout />);

    expect(slotRenderCount).toBe(1);
    expect(stackRenderCount).toBe(0);
    expect(capturedScreenOptions).toBeUndefined();
    expect(mockReconcileRunningTimer).toHaveBeenCalledTimes(1);
    expect(mockPullForCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('reconciles pomodoro timer when app returns to active', () => {
    render(<RootLayout />);

    expect(mockAppStateAddEventListener).toHaveBeenCalledTimes(1);
    const appStateListener = mockAppStateAddEventListener.mock.calls[0]?.[1] as
      | ((state: string) => void)
      | undefined;

    appStateListener?.('background');
    expect(mockReconcileRunningTimer).toHaveBeenCalledTimes(1);
    expect(mockPushForCurrentUser).toHaveBeenCalledTimes(1);

    appStateListener?.('active');
    expect(mockReconcileRunningTimer).toHaveBeenCalledTimes(2);
    expect(mockPullForCurrentUser).toHaveBeenCalledTimes(2);
  });
});
