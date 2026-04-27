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
import { Halo, ScreenHeader, SectionLabel } from '@/design';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { fireConfetti } from '@/utils/confetti';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function PomodoroScreen() {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const sessionsCount = usePomodoroStore((s) => s.sessions.length);
  const phase = usePomodoroStore((s) => s.phase);
  const cycleCount = usePomodoroStore((s) => s.cycleCount);
  const breakDuration = usePomodoroStore((s) => s.breakDuration);
  const workDuration = usePomodoroStore((s) => s.workDuration);
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

  const isWork = phase === 'work';
  const nextLabel = isWork ? `Next: ${breakDuration}-min break` : `Next: ${workDuration}-min focus`;
  const subtitle = `Cycle ${cycleCount + 1} · ${isWork ? 'Focus' : 'Break'} · ${pad(workDuration)}:00`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Halo size={420} top={60} right={-140} opacity={theme.isDark ? 0.2 : 0.12} />
      <ScrollView
        contentContainerStyle={{ minHeight: height, backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Pomodoro"
          subtitle={subtitle}
          right={
            <TouchableOpacity
              testID="timer-settings-btn"
              onPress={() => setShowSettings(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <Ionicons name="settings-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          }
        />

        <TimerDisplay />

        <TimerControls />

        <Text
          style={{
            textAlign: 'center',
            marginTop: 18,
            fontSize: 13,
            color: theme.textSubtle,
          }}>
          {nextLabel}
        </Text>

        <View style={{ marginTop: 24 }}>
          <SectionLabel>Link to task</SectionLabel>
          <View style={{ paddingHorizontal: 20 }}>
            <TaskPicker />
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionLabel>Bulk tasks</SectionLabel>
          <View style={{ paddingHorizontal: 20 }}>
            <TaskQueue />
          </View>
        </View>

        <View style={{ marginTop: 20, marginBottom: 32 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingBottom: 8,
            }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: theme.textSubtle,
              }}>
              Session log
            </Text>
            {confirmClearLog ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Clear all?</Text>
                <TouchableOpacity
                  onPress={() => setConfirmClearLog(false)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    borderColor: theme.border,
                    borderWidth: 1,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textMuted }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    clearSessions();
                    setConfirmClearLog(false);
                  }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: theme.danger,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                testID="clear-session-log-btn"
                onPress={() => setConfirmClearLog(true)}>
                <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <SessionLog />
          </View>
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
