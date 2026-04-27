import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { NextReminderDebugPanel } from '@/components/tasks/NextReminderDebugPanel';
import { TaskList } from '@/components/tasks/TaskList';
import { FAB } from '@/components/ui/FAB';
import { Halo, ScreenHeader } from '@/design';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/stores/taskStore';
import { fireConfetti } from '@/utils/confetti';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export default function TasksScreen() {
  const theme = useAppTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const { width } = useWindowDimensions();
  const [showAdd, setShowAdd] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTaskCompleted = () => {
    if (Platform.OS === 'web') {
      fireConfetti();
      return;
    }
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    setShowConfetti(true);
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
      confettiTimeoutRef.current = null;
    }, 2400);
  };

  useEffect(
    () => () => {
      if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    },
    []
  );

  const ordered = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks]);
  const toDo = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const today = WEEKDAYS[new Date().getDay()];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Halo size={380} top={-140} right={-80} opacity={theme.isDark ? 0.12 : 0.1} />

      <ScreenHeader title="Tasks" subtitle={`${today} · ${toDo} to do · ${done} done`} />

      {__DEV__ && Platform.OS === 'web' ? <NextReminderDebugPanel tasks={tasks} /> : null}

      <View style={{ flex: 1, marginTop: 4 }}>
        <TaskList tasks={ordered} onTaskCompleted={handleTaskCompleted} />
      </View>

      <FAB onPress={() => setShowAdd(true)} bottomOffset={24} align="right" />
      <AddTaskModal visible={showAdd} onClose={() => setShowAdd(false)} />

      {Platform.OS !== 'web' && showConfetti && (
        <View pointerEvents="none" style={styles.confettiOverlay}>
          <ConfettiCannon
            count={90}
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
