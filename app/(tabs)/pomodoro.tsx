import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionLog } from '@/components/pomodoro/SessionLog';
import { TaskPicker } from '@/components/pomodoro/TaskPicker';
import { TaskQueue } from '@/components/pomodoro/TaskQueue';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerSettings } from '@/components/pomodoro/TimerSettings';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { fireConfetti } from '@/utils/confetti';

export default function PomodoroScreen() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const sessionsCount = usePomodoroStore((s) => s.sessions.length);
  const previousSessionsCountRef = useRef(sessionsCount);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClearLog, setConfirmClearLog] = useState(false);
  const clearSessions = usePomodoroStore((s) => s.clearSessions);
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
      <ScrollView
        contentContainerStyle={{ minHeight: height, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Focus
          </Text>
          <TouchableOpacity
            testID="timer-settings-btn"
            onPress={() => setShowSettings(true)}
            className="p-1">
            <Ionicons name="settings-outline" size={22} color={theme.textMuted} />
          </TouchableOpacity>
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

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
            Bulk tasks
          </Text>
          <TaskQueue />
        </View>

        <View className="px-4 mt-6 mb-8">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-semibold" style={{ color: theme.textMuted }}>
              Session log
            </Text>
            {confirmClearLog ? (
              <View className="flex-row items-center gap-2">
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  Clear all?
                </Text>
                <TouchableOpacity
                  onPress={() => setConfirmClearLog(false)}
                  className="px-2 py-1 rounded-lg"
                  style={{ borderColor: theme.border, borderWidth: 1 }}>
                  <Text className="text-xs font-medium" style={{ color: theme.textMuted }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    clearSessions();
                    setConfirmClearLog(false);
                  }}
                  className="px-2 py-1 rounded-lg"
                  style={{ backgroundColor: theme.danger }}>
                  <Text className="text-xs font-semibold text-white">Clear</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                testID="clear-session-log-btn"
                onPress={() => setConfirmClearLog(true)}
                className="p-1">
                <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
          <SessionLog />
        </View>
      </ScrollView>

      <TimerSettings visible={showSettings} onClose={() => setShowSettings(false)} />

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
