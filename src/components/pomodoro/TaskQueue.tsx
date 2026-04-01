import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

export function TaskQueue() {
  const theme = useAppTheme();
  const { taskQueue, status, setTaskQueue, startQueue } = usePomodoroStore((s) => ({
    taskQueue: s.taskQueue,
    status: s.status,
    setTaskQueue: s.setTaskQueue,
    startQueue: s.startQueue,
  }));
  const tasks = useTaskStore((s) => s.tasks);
  const activeTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const toggleTask = (id: string) => {
    if (taskQueue.includes(id)) {
      setTaskQueue(taskQueue.filter((qId) => qId !== id));
    } else {
      setTaskQueue([...taskQueue, id]);
    }
  };

  const canStart = taskQueue.length > 0 && status !== 'running';

  return (
    <View className="gap-3">
      {/* Task list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}>
        {activeTasks.map((task) => {
          const queueIndex = taskQueue.indexOf(task.id);
          const isQueued = queueIndex !== -1;
          return (
            <TouchableOpacity
              key={task.id}
              onPress={() => toggleTask(task.id)}
              className="px-3 py-2 rounded-full border flex-row items-center gap-1.5 max-w-44"
              style={{
                backgroundColor: isQueued ? theme.primary : theme.surface,
                borderColor: isQueued ? theme.primary : theme.border,
              }}>
              {isQueued && (
                <View
                  className="w-4 h-4 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  <Text className="text-xs font-bold text-white">{queueIndex + 1}</Text>
                </View>
              )}
              <Text
                className="text-sm font-medium"
                numberOfLines={1}
                style={{ color: isQueued ? '#fff' : theme.textMuted }}>
                {task.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        {activeTasks.length === 0 && (
          <View className="px-3 py-2">
            <Text className="text-sm" style={{ color: theme.textSubtle }}>
              No active tasks
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Start button */}
      <TouchableOpacity
        onPress={() => canStart && startQueue(taskQueue)}
        className="py-2.5 rounded-xl items-center"
        style={{
          backgroundColor: canStart ? theme.primary : theme.surfaceMuted,
          borderColor: theme.border,
          borderWidth: canStart ? 0 : 1,
        }}>
        <Text
          className="text-sm font-semibold"
          style={{ color: canStart ? '#fff' : theme.textSubtle }}>
          Start queue
        </Text>
      </TouchableOpacity>
    </View>
  );
}
