import '../global.css';

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebNotificationFallbackToast } from '@/components/ui/WebNotificationFallbackToast';
import { isApplyingSnapshot, pullForCurrentUser, pushForCurrentUser } from '@/services/cloudSync';
import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTaskStore } from '@/stores/taskStore';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const isExpoGo = Constants.appOwnership === 'expo';
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
  });
  const pendingPush = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
    useTaskStore.getState().resetRecurringTasksIfNewDay();
    usePomodoroStore.getState().reconcileRunningTimer();
    void pullForCurrentUser();

    // Debounced push triggered on any store mutation
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePush = () => {
      if (isApplyingSnapshot) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(async () => {
        const ok = await pushForCurrentUser();
        if (!ok) pendingPush.current = true;
        else pendingPush.current = false;
      }, 1500);
    };

    const unsubscribes = [
      useFinanceStore.subscribe(schedulePush),
      useTaskStore.subscribe(schedulePush),
      usePomodoroStore.subscribe(schedulePush),
      useSettingsStore.subscribe(schedulePush),
    ];

    // Push when connectivity is restored while the app is in the foreground
    const netUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && pendingPush.current) {
        pendingPush.current = false;
        void pushForCurrentUser();
      }
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        usePomodoroStore.getState().reconcileRunningTimer();
        // Flush any pending push before pulling (handles offline→online via app switch)
        if (pendingPush.current) {
          pendingPush.current = false;
          void pushForCurrentUser();
        }
        void pullForCurrentUser();
      }

      if (nextState === 'background') {
        if (pushTimer) clearTimeout(pushTimer);
        void pushForCurrentUser();
      }
    });

    return () => {
      if (pushTimer) clearTimeout(pushTimer);
      unsubscribes.forEach((u) => u());
      netUnsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          {isExpoGo ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />}
          <WebNotificationFallbackToast />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
