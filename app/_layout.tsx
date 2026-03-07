import '../global.css';

import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Slot, Stack } from 'expo-router';
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
  const isExpoGo = Constants.appOwnership === 'expo';
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
    useTaskStore.getState().resetRecurringTasksIfNewDay();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {isExpoGo ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />}
        <WebNotificationFallbackToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
