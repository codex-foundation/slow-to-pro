import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { ManageCategoriesModal } from '@/components/tasks/ManageCategoriesModal';
import { NextReminderDebugPanel } from '@/components/tasks/NextReminderDebugPanel';
import { TaskList } from '@/components/tasks/TaskList';
import { FAB } from '@/components/ui/FAB';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/stores/taskStore';
import { fireConfetti } from '@/utils/confetti';

type Filter = 'all' | 'active' | 'completed';

export default function TasksScreen() {
  const theme = useAppTheme();
  const tasks = useTaskStore((s) => s.tasks);
  const categories = useTaskStore((s) => s.categories);
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('active');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
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
      if (filter === 'active' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Tasks
          </Text>
          <TouchableOpacity
            testID="manage-categories-open"
            onPress={() => setShowManageCategories(true)}
            className="p-1">
            <Ionicons name="pricetag-outline" size={20} color={theme.textSubtle} />
          </TouchableOpacity>
        </View>
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

        {categories.length > 0 && (
          <>
            <Text
              className="text-xs font-semibold uppercase mt-3 mb-1"
              style={{ color: theme.textSubtle }}>
              Categories
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setCategoryFilter(null)}
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: categoryFilter === null ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: categoryFilter === null ? theme.primary : theme.border,
                }}>
                <Text
                  className="text-xs font-medium"
                  style={{ color: categoryFilter === null ? '#fff' : theme.textMuted }}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                  className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: categoryFilter === cat.id ? cat.color + '22' : theme.surface,
                    borderWidth: 1,
                    borderColor: categoryFilter === cat.id ? cat.color : theme.border,
                  }}>
                  <View
                    style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: cat.color }}
                  />
                  <Text
                    className="text-xs font-medium"
                    style={{ color: categoryFilter === cat.id ? cat.color : theme.textMuted }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {__DEV__ && Platform.OS === 'web' ? <NextReminderDebugPanel tasks={tasks} /> : null}

      <TaskList tasks={filtered} onTaskCompleted={handleTaskCompleted} />

      <FAB onPress={() => setShowAdd(true)} bottomOffset={20} />
      <AddTaskModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <ManageCategoriesModal
        visible={showManageCategories}
        onClose={() => setShowManageCategories(false)}
      />

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
