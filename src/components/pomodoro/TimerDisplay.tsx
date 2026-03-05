import { Text, View } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function TimerDisplay() {
  const { secondsRemaining, phase, cycleCount } = usePomodoroStore();
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isWork = phase === 'work';

  return (
    <View className="items-center py-10">
      <Text
        className={`text-sm font-semibold uppercase tracking-widest mb-2 ${isWork ? 'text-indigo-400' : 'text-green-500'}`}>
        {isWork ? 'Focus' : 'Break'}
      </Text>
      <Text
        className={`text-8xl font-thin tabular-nums ${isWork ? 'text-gray-900' : 'text-green-600'}`}>
        {pad(minutes)}:{pad(seconds)}
      </Text>
      {cycleCount > 0 && (
        <Text className="text-xs text-gray-400 mt-3">
          {cycleCount} {cycleCount === 1 ? 'session' : 'sessions'} completed today
        </Text>
      )}
    </View>
  );
}
