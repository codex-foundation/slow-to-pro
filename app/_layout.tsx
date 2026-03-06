import '../global.css';

import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebNotificationFallbackToast } from '@/components/ui/WebNotificationFallbackToast';
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
  const themePreference = useSettingsStore((s) => s.themePreference);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
    useTaskStore.getState().resetRecurringTasksIfNewDay();
  }, []);

  useEffect(() => {
    if (typeof Appearance.setColorScheme !== 'function') return;
    Appearance.setColorScheme(themePreference === 'system' ? null : themePreference);
  }, [themePreference]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <WebNotificationFallbackToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
