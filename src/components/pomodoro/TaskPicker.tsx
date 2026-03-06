import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';
import { getTheme } from '@/utils/theme';

export function TaskPicker() {
  const theme = getTheme(useColorScheme());
  const selectedTaskId = usePomodoroStore((s) => s.selectedTaskId);
  const setSelectedTask = usePomodoroStore((s) => s.setSelectedTask);
  const tasks = useTaskStore((s) => s.tasks);
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}>
      <TouchableOpacity
        onPress={() => setSelectedTask(null)}
        className="px-3 py-2 rounded-full border"
        style={{
          backgroundColor: selectedTaskId === null ? theme.primary : theme.surface,
          borderColor: selectedTaskId === null ? theme.primary : theme.border,
        }}>
        <Text
          className="text-sm font-medium"
          style={{ color: selectedTaskId === null ? '#fff' : theme.textMuted }}>
          None
        </Text>
      </TouchableOpacity>

      {activeTasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          onPress={() => setSelectedTask(task.id)}
          className="px-3 py-2 rounded-full border max-w-40"
          style={{
            backgroundColor: selectedTaskId === task.id ? theme.primary : theme.surface,
            borderColor: selectedTaskId === task.id ? theme.primary : theme.border,
          }}>
          <Text
            className="text-sm font-medium"
            style={{ color: selectedTaskId === task.id ? '#fff' : theme.textMuted }}
            numberOfLines={1}>
            {task.title}
          </Text>
        </TouchableOpacity>
      ))}

      {activeTasks.length === 0 && (
        <View className="px-3 py-2">
          <Text className="text-sm" style={{ color: theme.textSubtle }}>
            No active tasks
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
