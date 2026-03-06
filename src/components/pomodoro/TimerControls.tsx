import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';

export function TimerControls() {
  const theme = useAppTheme();
  const { status, start, pause, reset } = usePomodoroStore();

  return (
    <View className="flex-row justify-center gap-4">
      <TouchableOpacity
        onPress={reset}
        className="w-14 h-14 rounded-full border-2 items-center justify-center"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <Text className="text-lg" style={{ color: theme.textMuted }}>
          ↺
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={status === 'running' ? pause : start}
        className="w-20 h-20 rounded-full items-center justify-center shadow-sm"
        style={{ backgroundColor: theme.primary }}
        activeOpacity={0.8}>
        <Text className="text-white text-2xl">{status === 'running' ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <View className="w-14 h-14" />
    </View>
  );
}
