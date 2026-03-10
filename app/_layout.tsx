import '../global.css';

import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Keyboard, Platform, TouchableWithoutFeedback, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WebNotificationFallbackToast } from '@/components/ui/WebNotificationFallbackToast';
import { usePomodoroStore } from '@/stores/pomodoroStore';
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

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
    }
    useTaskStore.getState().resetRecurringTasksIfNewDay();
    usePomodoroStore.getState().reconcileRunningTimer();

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        usePomodoroStore.getState().reconcileRunningTimer();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, []);

  if (!fontsLoaded && !fontsError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            {isExpoGo ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />}
            <WebNotificationFallbackToast />
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
