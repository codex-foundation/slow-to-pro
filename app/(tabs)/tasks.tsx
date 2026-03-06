import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { NextReminderDebugPanel } from '@/components/tasks/NextReminderDebugPanel';
import { TaskList } from '@/components/tasks/TaskList';
import { FAB } from '@/components/ui/FAB';
import { useTaskStore } from '@/stores/taskStore';

type Filter = 'all' | 'active' | 'completed';

export default function TasksScreen() {
  const theme = useAppTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
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

      <TaskList tasks={filtered} />

      <FAB onPress={() => setShowAdd(true)} />
      <AddTaskModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </SafeAreaView>
  );
}
