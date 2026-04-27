import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';

export function TimerControls() {
  const theme = useAppTheme();
  const status = usePomodoroStore((s) => s.status);
  const start = usePomodoroStore((s) => s.start);
  const pause = usePomodoroStore((s) => s.pause);
  const reset = usePomodoroStore((s) => s.reset);
  const isRunning = status === 'running';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 20,
      }}>
      <TouchableOpacity
        testID="timer-reset-button"
        onPress={reset}
        accessibilityRole="button"
        accessibilityLabel="Reset timer"
        accessibilityHint="Resets the current pomodoro timer"
        style={{
          flex: 1,
          maxWidth: 160,
          height: 56,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        }}>
        <Ionicons name="refresh" size={16} color={theme.textMuted} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted }}>Reset</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="timer-primary-button"
        onPress={isRunning ? pause : start}
        accessibilityRole="button"
        accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
        accessibilityHint={
          isRunning ? 'Pauses the current focus or break session' : 'Starts the current session'
        }
        activeOpacity={0.85}
        style={{
          flex: 1,
          maxWidth: 160,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        }}>
        <Ionicons name={isRunning ? 'pause' : 'play'} size={16} color="#fff" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
          {isRunning ? 'Pause' : 'Start'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
