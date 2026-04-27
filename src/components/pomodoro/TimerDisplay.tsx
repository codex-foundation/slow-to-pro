import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

const SIZE = 300;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function TimerDisplay() {
  const theme = useAppTheme();
  const secondsRemaining = usePomodoroStore((s) => s.secondsRemaining);
  const phase = usePomodoroStore((s) => s.phase);
  const selectedTaskId = usePomodoroStore((s) => s.selectedTaskId);
  const workDuration = usePomodoroStore((s) => s.workDuration);
  const breakDuration = usePomodoroStore((s) => s.breakDuration);
  const tasks = useTaskStore((s) => s.tasks);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isWork = phase === 'work';
  const totalSeconds = (isWork ? workDuration : breakDuration) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsRemaining / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const runningTaskTitle = useMemo(
    () =>
      isWork && selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId)?.title ?? null) : null,
    [isWork, selectedTaskId, tasks]
  );

  const accentColor = isWork ? theme.primary : theme.success;
  const trackColor = theme.isDark ? '#1e3a8a' : '#dbeafe';

  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={SIZE}
          height={SIZE}
          style={{ position: 'absolute' }}
          viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={trackColor}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={accentColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 72,
              fontWeight: '700',
              letterSpacing: -3,
              color: theme.text,
              fontVariant: ['tabular-nums'],
            }}>
            {pad(minutes)}:{pad(seconds)}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 3,
              color: theme.textSubtle,
            }}>
            {isWork ? 'FOCUS' : 'BREAK'}
          </Text>
          {runningTaskTitle && (
            <Text
              numberOfLines={1}
              style={{
                marginTop: 10,
                maxWidth: SIZE - 60,
                fontSize: 13,
                color: theme.textMuted,
              }}>
              {runningTaskTitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
