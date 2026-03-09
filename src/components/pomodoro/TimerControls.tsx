import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';

export function TimerControls() {
  const theme = useAppTheme();
  const { status, start, pause, reset } = usePomodoroStore();
  const isRunning = status === 'running';

  return (
    <View className="flex-row justify-center gap-4">
      <TouchableOpacity
        testID="timer-reset-button"
        onPress={reset}
        className="w-14 h-14 rounded-full border-2 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Reset timer"
        accessibilityHint="Resets the current pomodoro timer"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <Ionicons name="refresh" size={16} color={theme.textMuted} />
        <Text className="text-xs font-semibold" style={{ color: theme.textMuted }}>
          RESET
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="timer-primary-button"
        onPress={isRunning ? pause : start}
        className="w-24 h-24 rounded-full items-center justify-center shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
        accessibilityHint={
          isRunning ? 'Pauses the current focus or break session' : 'Starts the current session'
        }
        style={{ backgroundColor: theme.primary }}
        activeOpacity={0.8}>
        <Ionicons name={isRunning ? 'pause' : 'play'} size={26} color="#fff" />
        <Text className="text-white text-sm font-semibold mt-1">
          {isRunning ? 'PAUSE' : 'START'}
        </Text>
      </TouchableOpacity>

      <View className="w-14 h-14" />
    </View>
  );
}
