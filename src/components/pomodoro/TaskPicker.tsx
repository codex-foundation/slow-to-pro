import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

export function TaskPicker() {
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
        className={`px-3 py-2 rounded-full border ${selectedTaskId === null ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200 bg-white'}`}>
        <Text
          className={`text-sm font-medium ${selectedTaskId === null ? 'text-white' : 'text-gray-600'}`}>
          None
        </Text>
      </TouchableOpacity>

      {activeTasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          onPress={() => setSelectedTask(task.id)}
          className={`px-3 py-2 rounded-full border max-w-40 ${selectedTaskId === task.id ? 'bg-indigo-500 border-indigo-500' : 'border-gray-200 bg-white'}`}>
          <Text
            className={`text-sm font-medium ${selectedTaskId === task.id ? 'text-white' : 'text-gray-600'}`}
            numberOfLines={1}>
            {task.title}
          </Text>
        </TouchableOpacity>
      ))}

      {activeTasks.length === 0 && (
        <View className="px-3 py-2">
          <Text className="text-sm text-gray-400">No active tasks</Text>
        </View>
      )}
    </ScrollView>
  );
}
