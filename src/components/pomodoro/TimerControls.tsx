import { Text, TouchableOpacity, View } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';

export function TimerControls() {
  const { status, start, pause, reset } = usePomodoroStore();

  return (
    <View className="flex-row justify-center gap-4">
      <TouchableOpacity
        onPress={reset}
        className="w-14 h-14 rounded-full border-2 border-gray-200 items-center justify-center">
        <Text className="text-gray-500 text-lg">↺</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={status === 'running' ? pause : start}
        className="w-20 h-20 rounded-full bg-indigo-500 items-center justify-center shadow-sm"
        activeOpacity={0.8}>
        <Text className="text-white text-2xl">{status === 'running' ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <View className="w-14 h-14" />
    </View>
  );
}
