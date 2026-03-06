import { useEffect, useRef } from 'react';
import { Platform, ScrollView, Text, View, useColorScheme } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionLog } from '@/components/pomodoro/SessionLog';
import { TaskPicker } from '@/components/pomodoro/TaskPicker';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { fireConfetti } from '@/utils/confetti';
import { getTheme } from '@/utils/theme';

export default function PomodoroScreen() {
  const theme = getTheme(useColorScheme());
  const status = usePomodoroStore((s) => s.status);
  const sessionsCount = usePomodoroStore((s) => s.sessions.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);
  const previousSessionsCountRef = useRef(sessionsCount);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        const remaining = usePomodoroStore.getState().secondsRemaining;
        if (remaining <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          usePomodoroStore.getState().completeCycle();
        } else {
          usePomodoroStore.getState().tick();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (sessionsCount > previousSessionsCountRef.current) {
      if (Platform.OS === 'web') {
        fireConfetti();
      } else {
        confettiRef.current?.start();
      }
    }

    previousSessionsCountRef.current = sessionsCount;
  }, [sessionsCount]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Focus
          </Text>
        </View>

        <TimerDisplay />

        <View className="px-4 mt-2">
          <TimerControls />
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
            Link to task
          </Text>
          <TaskPicker />
        </View>

        <View className="px-4 mt-6 mb-8">
          <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
            Session log
          </Text>
          <SessionLog />
        </View>
      </ScrollView>

      {Platform.OS !== 'web' && (
        <ConfettiCannon
          ref={confettiRef}
          count={80}
          origin={{ x: 0, y: 0 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2200}
        />
      )}
    </SafeAreaView>
  );
}
