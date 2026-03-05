import '../global.css';

import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebNotificationFallbackToast } from '@/components/ui/WebNotificationFallbackToast';
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
  useEffect(() => {
    if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
      void Notification.requestPermission();
    } else if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
    useTaskStore.getState().resetRecurringTasksIfNewDay();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <WebNotificationFallbackToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
