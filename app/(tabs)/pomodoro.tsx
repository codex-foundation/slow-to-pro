import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { SessionLog } from '@/components/pomodoro/SessionLog';
import { TaskPicker } from '@/components/pomodoro/TaskPicker';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { fireConfetti } from '@/utils/confetti';

export default function PomodoroScreen() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const sessionsCount = usePomodoroStore((s) => s.sessions.length);
  const previousSessionsCountRef = useRef(sessionsCount);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sessionsCount > previousSessionsCountRef.current) {
      if (Platform.OS === 'web') {
        fireConfetti();
      } else {
        if (confettiTimeoutRef.current) {
          clearTimeout(confettiTimeoutRef.current);
        }
        setShowConfetti(true);
        confettiTimeoutRef.current = setTimeout(() => {
          setShowConfetti(false);
          confettiTimeoutRef.current = null;
        }, 2400);
      }
    }

    previousSessionsCountRef.current = sessionsCount;
  }, [sessionsCount]);

  useEffect(
    () => () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    },
    []
  );

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

      {Platform.OS !== 'web' && showConfetti && (
        <View pointerEvents="none" style={styles.confettiOverlay}>
          <ConfettiCannon
            count={80}
            origin={{ x: width / 2, y: 18 }}
            autoStart
            fadeOut
            explosionSpeed={700}
            fallSpeed={2400}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
});
