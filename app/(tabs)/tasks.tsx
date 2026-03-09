import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { NextReminderDebugPanel } from '@/components/tasks/NextReminderDebugPanel';
import { TaskList } from '@/components/tasks/TaskList';
import { FAB } from '@/components/ui/FAB';
import { useTaskStore } from '@/stores/taskStore';
import { fireConfetti } from '@/utils/confetti';

type Filter = 'all' | 'active' | 'completed';

export default function TasksScreen() {
  const theme = useAppTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTaskCompleted = () => {
    if (Platform.OS === 'web') {
      fireConfetti();
      return;
    }

    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    setShowConfetti(true);
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
      confettiTimeoutRef.current = null;
    }, 2400);
  };

  useEffect(
    () => () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    },
    []
  );

  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Tasks
        </Text>
        <View className="flex-row mt-3 gap-2">
          {(['all', 'active', 'completed'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full"
              style={{
                backgroundColor: filter === f ? theme.primary : theme.surface,
                borderWidth: filter === f ? 0 : 1,
                borderColor: theme.border,
              }}>
              <Text
                className="text-sm font-medium capitalize"
                style={{ color: filter === f ? '#fff' : theme.textMuted }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {__DEV__ && Platform.OS === 'web' ? <NextReminderDebugPanel tasks={tasks} /> : null}

      <TaskList tasks={filtered} onTaskCompleted={handleTaskCompleted} />

      <FAB onPress={() => setShowAdd(true)} bottomOffset={20} />
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
