import { Text, View, useColorScheme } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { getTheme } from '@/utils/theme';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function TimerDisplay() {
  const theme = getTheme(useColorScheme());
  const { secondsRemaining, phase, cycleCount } = usePomodoroStore();
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isWork = phase === 'work';

  return (
    <View
      className="items-center py-10 rounded-2xl mx-4"
      style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }}>
      <Text
        className="text-sm font-semibold uppercase tracking-widest mb-2"
        style={{ color: isWork ? theme.primary : theme.success }}>
        {isWork ? 'Focus' : 'Break'}
      </Text>
      <Text
        className="text-8xl font-thin tabular-nums"
        style={{ color: isWork ? theme.text : theme.success }}>
        {pad(minutes)}:{pad(seconds)}
      </Text>
      {cycleCount > 0 && (
        <Text className="text-xs mt-3" style={{ color: theme.textSubtle }}>
          {cycleCount} {cycleCount === 1 ? 'session' : 'sessions'} completed today
        </Text>
      )}
    </View>
  );
}
