import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockAppStateRemove = jest.fn();
const mockAppStateAddEventListener = jest.fn(
  (_eventType: string, _listener: (state: string) => void) => ({
    remove: mockAppStateRemove,
  })
);

let capturedNetInfoCallback: ((state: { isConnected: boolean }) => void) | null = null;
let capturedAuthStateChangeCallback: ((event: string) => void) | null = null;
let capturedStoreSubscriptionCallback: (() => void) | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean }) => void) => {
      capturedNetInfoCallback = cb;
      return jest.fn();
    }),
  },
}));

jest.mock('../../global.css', () => ({}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'expo',
  },
}));

const mockUseFonts = jest.fn<[boolean, Error | null], [Record<string, unknown>]>(() => [
  true,
  null,
]);

jest.mock('expo-font', () => ({
  useFonts: (...args: [Record<string, unknown>]) => mockUseFonts(...args),
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

const mockInitializePurchases = jest.fn(async () => {});
const mockReadProStatusFromDb = jest.fn(async () => false);
const mockRefreshProStatus = jest.fn(async () => {});

jest.mock('@/utils/purchases', () => ({
  initializePurchases: () => mockInitializePurchases(),
  readProStatusFromDb: () => mockReadProStatusFromDb(),
  refreshProStatus: () => mockRefreshProStatus(),
}));

const mockUnsubscribeAuth = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb) => {
        capturedAuthStateChangeCallback = cb;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribeAuth } },
        };
      }),
    },
  },
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
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/stores/pomodoroStore', () => ({
  usePomodoroStore: {
    getState: () => ({
      reconcileRunningTimer: mockReconcileRunningTimer,
    }),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/stores/financeStore', () => ({
  useFinanceStore: {
    subscribe: jest.fn((cb: () => void) => {
      capturedStoreSubscriptionCallback = cb;
      return jest.fn();
    }),
  },
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/stores/spaceStore', () => ({
  useSpaceStore: {
    getState: () => ({ activeSpaceId: null }),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/stores/entitlementStore', () => ({
  useEntitlementStore: {
    getState: () => ({
      setIsPro: jest.fn(),
      setLoading: jest.fn(),
      setIsRcPro: jest.fn(),
    }),
  },
}));

const mockPushToSharedSpace = jest.fn(async () => {});

jest.mock('@/services/cloudSync', () => ({
  isApplyingSnapshot: false,
  pullForCurrentUser: () => mockPullForCurrentUser(),
  pushForCurrentUser: () => mockPushForCurrentUser(),
}));

jest.mock('@/services/spaceSync', () => ({
  isApplyingSpaceSnapshot: false,
  pushToSharedSpace: () => mockPushToSharedSpace(),
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
    mockInitializePurchases.mockClear();
    mockReadProStatusFromDb.mockClear();
    mockRefreshProStatus.mockClear();
    mockUnsubscribeAuth.mockClear();
    mockPushToSharedSpace.mockClear();
    capturedNetInfoCallback = null;
    capturedAuthStateChangeCallback = null;
    capturedStoreSubscriptionCallback = null;
    mockUseFonts.mockReturnValue([true, null]);
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

  it('calls initializePurchases on mount (native path)', () => {
    render(<RootLayout />);
    // initializePurchases is called in useEffect when Platform.OS !== 'web'
    expect(mockInitializePurchases).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from auth and app state on unmount', () => {
    const { unmount } = render(<RootLayout />);
    unmount();
    expect(mockUnsubscribeAuth).toHaveBeenCalled();
    expect(mockAppStateRemove).toHaveBeenCalled();
  });

  it('calls refreshProStatus on SIGNED_IN auth event', async () => {
    render(<RootLayout />);
    await act(async () => {
      capturedAuthStateChangeCallback?.('SIGNED_IN');
    });
    expect(mockRefreshProStatus).toHaveBeenCalledTimes(1);
  });

  it('calls refreshProStatus on TOKEN_REFRESHED auth event', async () => {
    render(<RootLayout />);
    await act(async () => {
      capturedAuthStateChangeCallback?.('TOKEN_REFRESHED');
    });
    expect(mockRefreshProStatus).toHaveBeenCalledTimes(1);
  });

  it('clears Pro status on SIGNED_OUT auth event', async () => {
    const mockSetIsPro = jest.fn();
    const mockSetIsRcPro = jest.fn();
    jest.requireMock('@/stores/entitlementStore').useEntitlementStore.getState = () => ({
      setIsPro: mockSetIsPro,
      setLoading: jest.fn(),
      setIsRcPro: mockSetIsRcPro,
    });

    render(<RootLayout />);
    await act(async () => {
      capturedAuthStateChangeCallback?.('SIGNED_OUT');
    });
    expect(mockSetIsPro).toHaveBeenCalledWith(false);
    expect(mockSetIsRcPro).toHaveBeenCalledWith(false);
  });

  it('pushes on NetInfo reconnect when there is a pending push', async () => {
    jest.useFakeTimers();
    render(<RootLayout />);

    // Trigger a store subscription to set pendingPush = true via failed push
    mockPushForCurrentUser.mockResolvedValueOnce(false);
    await act(async () => {
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Now simulate network reconnect
    await act(async () => {
      capturedNetInfoCallback?.({ isConnected: true });
    });

    expect(mockPushForCurrentUser).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('triggers schedulePush via store subscription', async () => {
    jest.useFakeTimers();
    render(<RootLayout />);

    mockPushForCurrentUser.mockResolvedValue(true);
    await act(async () => {
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockPushForCurrentUser).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('calls setNotificationHandler handleNotification callback', async () => {
    const notifsMock = jest.requireMock('expo-notifications') as {
      setNotificationHandler: jest.Mock;
    };
    render(<RootLayout />);
    const handlerConfig = notifsMock.setNotificationHandler.mock.calls[0]?.[0] as {
      handleNotification?: () => Promise<unknown>;
    };
    const result = await handlerConfig?.handleNotification?.();
    expect(result).toEqual({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });

  it('returns null when fonts have not loaded yet', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it('loads readProStatusFromDb on web platform', async () => {
    const RN = jest.requireActual('react-native') as typeof import('react-native');
    jest.replaceProperty(RN.Platform, 'OS', 'web');
    mockReadProStatusFromDb.mockResolvedValue(true);
    const mockSetIsPro = jest.fn();
    const mockSetLoading = jest.fn();
    jest.requireMock('@/stores/entitlementStore').useEntitlementStore.getState = () => ({
      setIsPro: mockSetIsPro,
      setLoading: mockSetLoading,
      setIsRcPro: jest.fn(),
    });

    render(<RootLayout />);
    // Let the async readProStatusFromDb resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReadProStatusFromDb).toHaveBeenCalledTimes(1);
    expect(mockSetIsPro).toHaveBeenCalledWith(true);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
    jest.restoreAllMocks();
  });

  it('skips schedulePush when isApplyingSnapshot is true', async () => {
    jest.useFakeTimers();
    const cloudSyncMock = jest.requireMock('@/services/cloudSync') as {
      isApplyingSnapshot: boolean;
    };
    cloudSyncMock.isApplyingSnapshot = true;

    render(<RootLayout />);
    await act(async () => {
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockPushForCurrentUser).not.toHaveBeenCalled();
    cloudSyncMock.isApplyingSnapshot = false;
    jest.useRealTimers();
  });

  it('pushes to shared space when activeSpaceId is set', async () => {
    jest.useFakeTimers();
    jest.requireMock('@/stores/spaceStore').useSpaceStore.getState = () => ({
      activeSpaceId: 'space-123',
    });

    render(<RootLayout />);
    await act(async () => {
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(mockPushToSharedSpace).toHaveBeenCalledTimes(1);
    jest.requireMock('@/stores/spaceStore').useSpaceStore.getState = () => ({
      activeSpaceId: null,
    });
    jest.useRealTimers();
  });

  it('flushes pending push when app becomes active with pendingPush = true', async () => {
    jest.useFakeTimers();
    render(<RootLayout />);

    // Set up a failed push to mark pendingPush = true
    mockPushForCurrentUser.mockResolvedValueOnce(false);
    await act(async () => {
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
    });
    await act(async () => {
      await Promise.resolve();
    });
    mockPushForCurrentUser.mockClear();
    mockPushForCurrentUser.mockResolvedValue(true);

    const appStateListener = mockAppStateAddEventListener.mock.calls[0]?.[1] as
      | ((state: string) => void)
      | undefined;

    await act(async () => {
      appStateListener?.('active');
    });

    expect(mockPushForCurrentUser).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does not call refreshProStatus for unrecognized auth events', async () => {
    render(<RootLayout />);
    await act(async () => {
      capturedAuthStateChangeCallback?.('USER_DELETED');
    });
    expect(mockRefreshProStatus).not.toHaveBeenCalled();
  });

  it('does not push when NetInfo reports disconnected', async () => {
    render(<RootLayout />);
    await act(async () => {
      capturedNetInfoCallback?.({ isConnected: false });
    });
    expect(mockPushForCurrentUser).not.toHaveBeenCalled();
  });

  it('debounces schedulePush when called multiple times (clears previous timer)', async () => {
    jest.useFakeTimers();
    render(<RootLayout />);

    mockPushForCurrentUser.mockResolvedValue(true);
    await act(async () => {
      // Call twice quickly — second call should clear first timer
      capturedStoreSubscriptionCallback?.();
      capturedStoreSubscriptionCallback?.();
      jest.advanceTimersByTime(2000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Should only push once (debounced)
    expect(mockPushForCurrentUser).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('clears pushTimer on background when it is already set', async () => {
    jest.useFakeTimers();
    render(<RootLayout />);

    const appStateListener = mockAppStateAddEventListener.mock.calls[0]?.[1] as
      | ((state: string) => void)
      | undefined;

    // Set up a pending timer first
    capturedStoreSubscriptionCallback?.();

    // Then go to background with an active timer
    await act(async () => {
      appStateListener?.('background');
    });

    expect(mockPushForCurrentUser).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('renders Stack when not in Expo Go', () => {
    jest.requireMock('expo-constants').default.appOwnership = 'standalone';
    render(<RootLayout />);
    expect(stackRenderCount).toBe(1);
    expect(slotRenderCount).toBe(0);
    expect(capturedScreenOptions).toEqual({ headerShown: false });
    jest.requireMock('expo-constants').default.appOwnership = 'expo';
  });
});
