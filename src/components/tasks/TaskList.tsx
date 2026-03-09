import { Text, FlatList, Platform, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';

import { useAppTheme } from '@/hooks/useAppTheme';
import type { Task } from '@/models/task';
import { useTaskStore } from '@/stores/taskStore';
import { TaskItem } from './TaskItem';

interface Props {
  tasks: Task[];
  onTaskCompleted?: () => void;
}

export function TaskList({ tasks, onTaskCompleted }: Props) {
  const theme = useAppTheme();
  const reorderTasks = useTaskStore((s) => s.reorderTasks);
  const allTasks = useTaskStore((s) => s.tasks);

  const commitVisibleReorder = (reorderedVisible: Task[]) => {
    const currentOrdered = [...allTasks].sort((a, b) => a.order - b.order);
    const visibleIds = new Set(tasks.map((t) => t.id));
    const visiblePositions: number[] = [];

    currentOrdered.forEach((task, index) => {
      if (visibleIds.has(task.id)) visiblePositions.push(index);
    });

    if (visiblePositions.length !== reorderedVisible.length) return;

    const nextOrdered = [...currentOrdered];
    visiblePositions.forEach((position, i) => {
      nextOrdered[position] = reorderedVisible[i];
    });

    reorderTasks(nextOrdered.map((task, index) => ({ ...task, order: index })));
  };

  const moveVisibleTask = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tasks.length || fromIndex === toIndex) return;
    const reorderedVisible = [...tasks];
    const [moved] = reorderedVisible.splice(fromIndex, 1);
    reorderedVisible.splice(toIndex, 0, moved);
    commitVisibleReorder(reorderedVisible);
  };

  if (tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center pb-24">
        <Text className="text-base" style={{ color: theme.textSubtle }}>
          No tasks yet — tap + to add one
        </Text>
      </View>
    );
  }

  if (Platform.OS !== 'android') {
    return (
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TaskItem
            item={item}
            onMoveUp={index > 0 ? () => moveVisibleTask(index, index - 1) : undefined}
            onMoveDown={
              index < tasks.length - 1 ? () => moveVisibleTask(index, index + 1) : undefined
            }
            onCompleted={onTaskCompleted}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    );
  }

  return (
    <DraggableFlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={(params) => <TaskItem {...params} onCompleted={onTaskCompleted} />}
      onDragEnd={({ data }) => commitVisibleReorder(data)}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}
