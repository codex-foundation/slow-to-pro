import '../global.css';

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebNotificationFallbackToast } from '@/components/ui/WebNotificationFallbackToast';
import { isApplyingSnapshot, pullForCurrentUser, pushForCurrentUser } from '@/services/cloudSync';
import { isApplyingSpaceSnapshot, pushToSharedSpace } from '@/services/spaceSync';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useFinanceStore } from '@/stores/financeStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useTaskStore } from '@/stores/taskStore';
import { supabase } from '@/lib/supabase';
import { initializePurchases, readProStatusFromDb, refreshProStatus } from '@/utils/purchases';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

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
  const [animationDone, setAnimationDone] = useState(false);
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
  });
  const pendingPush = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
      void initializePurchases();
    } else {
      // On web RevenueCat isn't available — still load DB Pro flag
      void readProStatusFromDb().then((isPro) => {
        useEntitlementStore.getState().setIsPro(isPro);
        useEntitlementStore.getState().setLoading(false);
      });
    }

    // Refresh Pro status whenever the auth session changes:
    // - SIGNED_IN covers cold-start session restore (session restored from MMKV after initializePurchases runs)
    // - TOKEN_REFRESHED covers silent token renewal on long sessions
    // - SIGNED_OUT clears the Pro flag immediately
    const authSubscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void refreshProStatus();
      } else if (event === 'SIGNED_OUT') {
        useEntitlementStore.getState().setIsPro(false);
        useEntitlementStore.getState().setIsRcPro(false);
      }
    });
    useTaskStore.getState().resetRecurringTasksIfNewDay();
    usePomodoroStore.getState().reconcileRunningTimer();
    void pullForCurrentUser();

    // Debounced push triggered on any store mutation.
    // When a shared space is active, push to the space instead of personal cloud
    // so space data never overwrites the personal backup.
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePush = () => {
      if (isApplyingSnapshot || isApplyingSpaceSnapshot) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(async () => {
        const { activeSpaceId } = useSpaceStore.getState();
        if (activeSpaceId) {
          await pushToSharedSpace(activeSpaceId);
        } else {
          const ok = await pushForCurrentUser();
          if (!ok) pendingPush.current = true;
          else pendingPush.current = false;
        }
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
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          {(fontsLoaded || fontsError) &&
            (isExpoGo ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />)}
          <WebNotificationFallbackToast />
        </View>
      </SafeAreaProvider>
      {Platform.OS !== 'web' && !animationDone && (
        <AnimatedSplash onFinish={() => setAnimationDone(true)} />
      )}
    </GestureHandlerRootView>
  );
}
