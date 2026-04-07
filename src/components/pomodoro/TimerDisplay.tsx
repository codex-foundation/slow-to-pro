import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function TimerDisplay() {
  const theme = useAppTheme();
  const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining);
  const phase = usePomodoroStore((s) => s.phase);
  const cycleCount = usePomodoroStore((s) => s.cycleCount);
  const selectedTaskId = usePomodoroStore((s) => s.selectedTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isWork = phase === 'work';
  const runningTaskTitle = useMemo(
    () =>
      isWork && selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId)?.title ?? null) : null,
    [isWork, selectedTaskId, tasks]
  );

  return (
    <View
      className="items-center py-10 rounded-2xl mx-4"
      style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }}>
      <Text
        className="text-sm font-semibold uppercase tracking-widest mb-2"
        style={{ color: isWork ? theme.primary : theme.success }}>
        {isWork ? 'Focus' : 'Break'}
      </Text>
      {runningTaskTitle && (
        <Text
          className="text-sm font-medium mb-1"
          numberOfLines={1}
          style={{ color: theme.textMuted }}>
          {runningTaskTitle}
        </Text>
      )}
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
