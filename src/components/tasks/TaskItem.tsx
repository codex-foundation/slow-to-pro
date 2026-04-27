import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { createElement, useState } from 'react';
import {
  Keyboard,
  Platform,
  Modal as RNModal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/useAppTheme';
import type { Priority, Task } from '@/models/task';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';
import { Modal } from '../ui/Modal';
import { PaywallModal } from '../ui/PaywallModal';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

interface PickerSheetProps {
  visible: boolean;
  title: string;
  testID: string;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}

function PickerSheet({ visible, title, testID, onClose, onConfirm, children }: PickerSheetProps) {
  const theme = useAppTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        testID={`${testID}-backdrop`}
        className="flex-1"
        activeOpacity={1}
        onPress={onClose}
        style={{ backgroundColor: theme.overlay }}
      />

      <View
        className="border-t rounded-t-2xl px-6 pt-4 pb-8"
        style={{
          backgroundColor: theme.surfaceElevated,
          borderTopColor: theme.border,
        }}
        testID={testID}>
        <Text className="text-lg font-bold mb-3" style={{ color: theme.text }}>
          {title}
        </Text>
        <View className="mb-4">{children}</View>
        <View className="flex-row justify-end gap-3">
          <TouchableOpacity testID={`${testID}-cancel`} onPress={onClose} className="px-3 py-2">
            <Text className="text-sm font-medium" style={{ color: theme.textSubtle }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`${testID}-done`}
            onPress={onConfirm}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: theme.primary,
            }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </RNModal>
  );
}

interface Props {
  item: Task;
  drag?: () => void;
  isActive?: boolean;
  onCompleted?: () => void;
}

export function TaskItem({ item, drag, isActive = false, onCompleted }: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const { toggleTask, deleteTask, updateTask } = useTaskStore();
  const categories = useTaskStore((s) => s.categories);
  const startWorkForTask = usePomodoroStore((s) => s.startWorkForTask);
  const isPro = useEntitlementStore((s) => s.isPro);
  const [showEdit, setShowEdit] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Animation values
  const checkboxScale = useSharedValue(1);
  const itemOpacity = useSharedValue(1);
  const strikethroughWidth = useSharedValue(item.completed ? 100 : 0);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editPriority, setEditPriority] = useState<Priority>(item.priority);
  const [editDueDate, setEditDueDate] = useState<Date | null>(
    item.dueDate ? new Date(item.dueDate) : null
  );
  const [editDueDateInput, setEditDueDateInput] = useState(
    item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : ''
  );
  const [showEditDueDatePicker, setShowEditDueDatePicker] = useState(false);
  const [editReminderEnabled, setEditReminderEnabled] = useState(!!item.reminderAt);
  const [editReminderDateTime, setEditReminderDateTime] = useState<Date | null>(
    item.reminderAt ? new Date(item.reminderAt) : null
  );
  const [editReminderDateInput, setEditReminderDateInput] = useState(
    item.reminderAt ? new Date(item.reminderAt).toISOString().slice(0, 10) : ''
  );
  const [editReminderTimeInput, setEditReminderTimeInput] = useState(() => {
    if (!item.reminderAt) return '09:00';
    const d = new Date(item.reminderAt);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [showEditReminderDatePicker, setShowEditReminderDatePicker] = useState(false);
  const [showEditReminderTimePicker, setShowEditReminderTimePicker] = useState(false);
  const [editRecurring, setEditRecurring] = useState(item.recurring.enabled);
  const [editDays, setEditDays] = useState<number[]>(item.recurring.days);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(item.categoryId ?? null);
  const dueDateText = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : null;
  const reminderText = item.reminderAt ? new Date(item.reminderAt).toLocaleString() : null;

  const nativePickerThemeProps =
    Platform.OS === 'ios'
      ? {
          themeVariant: theme.isDark ? ('dark' as const) : ('light' as const),
          textColor: theme.text,
        }
      : {};

  const hasEditDueDateValue = editDueDate !== null || editDueDateInput.trim().length > 0;
  const hasEditReminderValue =
    editReminderEnabled ||
    editReminderDateTime !== null ||
    editReminderDateInput.trim().length > 0 ||
    editReminderTimeInput !== '09:00';

  const parseDateToEndOfDay = (dateText: string): number | undefined => {
    const normalized = dateText.trim();
    if (!normalized) return undefined;
    const parsed = new Date(`${normalized}T23:59:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
  };

  const parseReminderDateTime = (dateText: string, timeText: string): number | undefined => {
    const date = dateText.trim();
    const time = timeText.trim();
    if (!date || !time) return undefined;
    const parsed = new Date(`${date}T${time}:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
  };

  const formatDate = (value: Date | null): string =>
    value ? value.toLocaleDateString() : 'Select date';
  const formatTime = (value: Date | null): string =>
    value ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select time';

  const openEdit = () => {
    setEditTitle(item.title);
    setEditPriority(item.priority);
    setEditDueDate(item.dueDate ? new Date(item.dueDate) : null);
    setEditDueDateInput(item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '');
    setShowEditDueDatePicker(false);

    setEditReminderEnabled(!!item.reminderAt);
    setEditReminderDateTime(item.reminderAt ? new Date(item.reminderAt) : null);
    setEditReminderDateInput(
      item.reminderAt ? new Date(item.reminderAt).toISOString().slice(0, 10) : ''
    );
    if (item.reminderAt) {
      const d = new Date(item.reminderAt);
      setEditReminderTimeInput(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    } else {
      setEditReminderTimeInput('09:00');
    }
    setShowEditReminderDatePicker(false);
    setShowEditReminderTimePicker(false);
    setEditRecurring(item.recurring.enabled);
    setEditDays(item.recurring.days);
    setEditCategoryId(item.categoryId ?? null);

    setShowEdit(true);
  };

  const toggleEditDay = (day: number) => {
    setEditDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const onChangeEditDueDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setEditDueDate(selected);
  };

  const onChangeEditReminderDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setEditReminderDateTime((prev) => {
      const next = new Date(selected);
      if (prev) {
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      } else {
        next.setHours(9, 0, 0, 0);
      }
      return next;
    });
  };

  const onChangeEditReminderTime = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setEditReminderDateTime((prev) => {
      const base = prev ? new Date(prev) : new Date();
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return base;
    });
  };

  const saveEdit = () => {
    const next = editTitle.trim();
    if (!next) return;

    const dueDateMs =
      Platform.OS === 'web'
        ? parseDateToEndOfDay(editDueDateInput)
        : editDueDate
          ? new Date(editDueDate).setHours(23, 59, 0, 0)
          : undefined;

    const reminderAtMs = editReminderEnabled
      ? Platform.OS === 'web'
        ? parseReminderDateTime(
            editRecurring ? new Date().toISOString().slice(0, 10) : editReminderDateInput,
            editReminderTimeInput
          )
        : editReminderDateTime
          ? editReminderDateTime.getTime()
          : undefined
      : undefined;

    if (editReminderEnabled && !reminderAtMs) return;

    updateTask(item.id, {
      title: next,
      priority: editPriority,
      categoryId: editCategoryId ?? undefined,
      dueDate: dueDateMs,
      reminderAt: reminderAtMs,
      recurring: { enabled: editRecurring, days: editDays },
    });
    setShowEdit(false);
  };

  const clearEditDueDate = () => {
    setEditDueDate(null);
    setEditDueDateInput('');
    setShowEditDueDatePicker(false);
  };

  const clearEditReminder = () => {
    setEditReminderEnabled(false);
    setEditReminderDateTime(null);
    setEditReminderDateInput('');
    setEditReminderTimeInput('09:00');
    setShowEditReminderDatePicker(false);
    setShowEditReminderTimePicker(false);
  };

  const openEditDueDatePicker = () => {
    if (!editDueDate) {
      const now = new Date();
      now.setHours(23, 59, 0, 0);
      setEditDueDate(now);
    }
    setShowEditDueDatePicker(true);
  };

  const enableEditReminder = (enabled: boolean) => {
    setEditReminderEnabled(enabled);
    if (enabled && !editReminderDateTime && Platform.OS !== 'web') {
      const next = new Date();
      next.setSeconds(0, 0);
      setEditReminderDateTime(next);
    }
  };

  const openEditReminderDatePicker = () => {
    if (!editReminderDateTime) {
      const next = new Date();
      next.setSeconds(0, 0);
      setEditReminderDateTime(next);
    }
    setShowEditReminderDatePicker(true);
  };

  const openEditReminderTimePicker = () => {
    if (!editReminderDateTime) {
      const next = new Date();
      next.setSeconds(0, 0);
      setEditReminderDateTime(next);
    }
    setShowEditReminderTimePicker(true);
  };

  const handleStartFocus = () => {
    startWorkForTask(item.id);
    router.replace('/(tabs)/pomodoro');
  };

  const focusBg = theme.isDark ? '#065f46' : '#d1fae5';
  const editBg = theme.isDark ? '#1e3a6e' : '#dbeafe';
  const deleteBg = theme.isDark ? '#7f1d1d' : '#fee2e2';

  const renderSwipeActions = () => (
    <View className="flex-row items-stretch">
      {!item.completed && (
        <TouchableOpacity
          testID="focus-task-start"
          onPress={handleStartFocus}
          className="w-20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Start focus on ${item.title}`}
          style={{ backgroundColor: focusBg }}>
          <Ionicons name="timer-outline" size={18} color={theme.success} />
          <Text className="text-xs mt-0.5" style={{ color: theme.success }}>
            Focus
          </Text>
        </TouchableOpacity>
      )}

      {!item.completed && (
        <TouchableOpacity
          testID="edit-task-open"
          onPress={openEdit}
          className="w-20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Edit task ${item.title}`}
          accessibilityHint="Opens task edit form"
          style={{ backgroundColor: editBg }}>
          <Ionicons name="create-outline" size={18} color={theme.primary} />
          <Text className="text-xs mt-0.5" style={{ color: theme.primary }}>
            Edit
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        testID="delete-task-swipe"
        onPress={() => deleteTask(item.id)}
        className="w-20 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={`Delete task ${item.title}`}
        accessibilityHint="Removes this task"
        style={{ backgroundColor: deleteBg }}>
        <Ionicons name="trash-outline" size={18} color={theme.danger} />
        <Text className="text-xs mt-0.5" style={{ color: theme.danger }}>
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleToggle = () => {
    // Animate checkbox
    checkboxScale.value = withSpring(0.8, {}, () => {
      checkboxScale.value = withSpring(1);
    });

    // Animate item opacity
    itemOpacity.value = withTiming(0.6, { duration: 150 }, () => {
      itemOpacity.value = withTiming(1, { duration: 150 });
    });

    // Animate strikethrough
    strikethroughWidth.value = withTiming(item.completed ? 0 : 100, { duration: 300 });

    // Fire confetti when completing (not uncompleting)
    if (!item.completed) {
      onCompleted?.();
    }

    toggleTask(item.id);
  };

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  const webInputStyle = {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
  };

  const category = item.categoryId ? categories.find((c) => c.id === item.categoryId) : null;
  const priorityPill =
    item.priority === 'high' ? { label: 'P1', bg: theme.primarySoft, fg: theme.primary } : null;

  const metaParts: string[] = [];
  if (dueDateText) metaParts.push(`Due: ${dueDateText}`);
  if (reminderText) metaParts.push(`Reminder: ${reminderText}`);
  const metaLine = metaParts.join(' · ');
  const showMeta = item.recurring.enabled || category || metaLine.length > 0;

  const rowContent = (
    <Animated.View
      testID="task-item-row"
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify().damping(15).stiffness(100)}
      style={[
        itemAnimatedStyle,
        {
          marginHorizontal: 20,
          marginBottom: 8,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: isActive ? 0.8 : 1,
        },
      ]}>
      <TouchableOpacity
        onPress={handleToggle}
        onLongPress={drag}
        accessibilityRole="checkbox"
        accessibilityLabel={item.title}
        accessibilityState={{ checked: item.completed }}
        accessibilityHint={item.completed ? 'Marks task as incomplete' : 'Marks task as complete'}>
        <Animated.View
          style={[
            checkboxAnimatedStyle,
            {
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: item.completed ? theme.primary : 'transparent',
              borderColor: item.completed ? theme.primary : theme.border,
            },
          ]}>
          {item.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </Animated.View>
      </TouchableOpacity>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: '600',
            textDecorationLine: item.completed ? 'line-through' : 'none',
            color: item.completed ? theme.textSubtle : theme.text,
          }}>
          {item.title}
        </Text>

        {showMeta && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 3,
              flexWrap: 'wrap',
            }}>
            {category && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: category.color,
                  }}
                />
                <Text style={{ fontSize: 11, color: theme.textSubtle }}>{category.name}</Text>
              </View>
            )}
            {item.recurring.enabled && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="repeat" size={11} color={theme.textSubtle} />
                <Text style={{ fontSize: 11, color: theme.textSubtle }}>Recurring</Text>
              </View>
            )}
            {metaLine.length > 0 && (
              <Text style={{ fontSize: 11, color: theme.textSubtle }} numberOfLines={1}>
                {metaLine}
              </Text>
            )}
          </View>
        )}
      </View>

      {priorityPill && (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 14,
            backgroundColor: priorityPill.bg,
          }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: priorityPill.fg }}>
            {priorityPill.label}
          </Text>
        </View>
      )}

      {Platform.OS === 'web' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {!item.completed && (
            <TouchableOpacity
              onPress={handleStartFocus}
              testID="focus-task-start"
              accessibilityRole="button"
              accessibilityLabel={`Start focus on ${item.title}`}>
              <Ionicons name="timer-outline" size={16} color={theme.success} />
            </TouchableOpacity>
          )}

          {!item.completed && (
            <TouchableOpacity
              onPress={openEdit}
              testID="edit-task-open"
              accessibilityRole="button"
              accessibilityLabel={`Edit task ${item.title}`}
              accessibilityHint="Opens task edit form">
              <Ionicons name="create-outline" size={16} color={theme.textSubtle} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => deleteTask(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Delete task ${item.title}`}
            accessibilityHint="Removes this task">
            <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        rowContent
      ) : (
        <Swipeable overshootRight={false} renderRightActions={renderSwipeActions}>
          {rowContent}
        </Swipeable>
      )}

      <Modal visible={showEdit} onClose={() => setShowEdit(false)} title="Edit task">
        <TextInput
          testID="edit-task-title-input"
          className="rounded-xl px-4 py-3 text-base mb-4"
          style={{
            borderColor: theme.border,
            borderWidth: 1,
            backgroundColor: theme.surface,
            color: theme.text,
          }}
          value={editTitle}
          onChangeText={setEditTitle}
          placeholderTextColor={theme.textSubtle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>
          Priority
        </Text>
        <View className="flex-row gap-2 mb-4">
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setEditPriority(p)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                backgroundColor: editPriority === p ? theme.primary : theme.surface,
                borderColor: editPriority === p ? theme.primary : theme.border,
              }}>
              <Text
                className="text-center text-sm font-medium"
                style={{ color: editPriority === p ? '#fff' : theme.textMuted }}>
                {PRIORITY_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {categories.length > 0 && (
          <>
            <Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setEditCategoryId(null)}
                className="px-3 py-1.5 rounded-full border"
                style={{
                  backgroundColor: editCategoryId === null ? theme.primary : theme.surface,
                  borderColor: editCategoryId === null ? theme.primary : theme.border,
                }}>
                <Text
                  className="text-xs font-medium"
                  style={{ color: editCategoryId === null ? '#fff' : theme.textMuted }}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setEditCategoryId(cat.id)}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: editCategoryId === cat.id ? cat.color + '22' : theme.surface,
                    borderColor: editCategoryId === cat.id ? cat.color : theme.border,
                  }}>
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }}
                  />
                  <Text
                    className="text-xs font-medium"
                    style={{ color: editCategoryId === cat.id ? cat.color : theme.textMuted }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
              Recurring task
            </Text>
            {!isPro && <Ionicons name="lock-closed-outline" size={12} color={theme.textSubtle} />}
          </View>
          <Switch
            testID="edit-recurring-switch"
            value={editRecurring}
            onValueChange={(v) => {
              if (!isPro) {
                setShowPaywall(true);
                return;
              }
              setEditRecurring(v);
            }}
            trackColor={{ true: theme.primary }}
          />
        </View>

        {editRecurring && (
          <View className="flex-row gap-1 mb-4 flex-wrap">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => (
              <TouchableOpacity
                key={i}
                testID={`edit-day-${i}`}
                onPress={() => toggleEditDay(i)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: editDays.includes(i) ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: editDays.includes(i) ? theme.primary : theme.border,
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: editDays.includes(i) ? '#fff' : theme.textMuted,
                  }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="flex-row items-center justify-between mb-2">
          {hasEditDueDateValue && (
            <TouchableOpacity onPress={clearEditDueDate}>
              <Text className="text-xs font-medium" style={{ color: theme.textSubtle }}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {Platform.OS === 'web' ? (
          <View className="mb-4">
            {createElement('input', {
              type: 'date',
              value: editDueDateInput,
              onChange: (e: { target: { value: string } }) => setEditDueDateInput(e.target.value),
              style: webInputStyle,
            })}
          </View>
        ) : (
          <>
            <TouchableOpacity
              testID="edit-due-date-open"
              onPress={openEditDueDatePicker}
              className="rounded-xl px-4 py-3 mb-4"
              style={{ borderColor: theme.border, borderWidth: 1, backgroundColor: theme.surface }}>
              <Text className="text-base" style={{ color: theme.text }}>
                {formatDate(editDueDate)}
              </Text>
            </TouchableOpacity>

            <PickerSheet
              visible={showEditDueDatePicker}
              title="Select due date"
              testID="edit-due-date-picker-modal"
              onClose={() => setShowEditDueDatePicker(false)}
              onConfirm={() => setShowEditDueDatePicker(false)}>
              <DateTimePicker
                value={editDueDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeEditDueDate}
                {...nativePickerThemeProps}
              />
            </PickerSheet>
          </>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
              Reminder
            </Text>
            {!isPro && <Ionicons name="lock-closed-outline" size={12} color={theme.textSubtle} />}
          </View>
          <View className="flex-row items-center gap-3">
            {hasEditReminderValue && (
              <TouchableOpacity onPress={clearEditReminder}>
                <Text className="text-xs font-medium" style={{ color: theme.textSubtle }}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}
            <Switch
              testID="edit-reminder-enabled-switch"
              value={editReminderEnabled}
              onValueChange={(v) => {
                if (!isPro) {
                  setShowPaywall(true);
                  return;
                }
                enableEditReminder(v);
              }}
              trackColor={{ true: theme.primary }}
            />
          </View>
        </View>

        {editReminderEnabled &&
          (Platform.OS === 'web' ? (
            <View className="flex-row gap-2 mb-4 items-center">
              {!editRecurring && (
                <View className="flex-1">
                  {createElement('input', {
                    type: 'date',
                    value: editReminderDateInput,
                    onChange: (e: { target: { value: string } }) =>
                      setEditReminderDateInput(e.target.value),
                    style: webInputStyle,
                  })}
                </View>
              )}
              <View style={editRecurring ? { flex: 1 } : { width: 120 }}>
                {createElement('input', {
                  type: 'time',
                  value: editReminderTimeInput,
                  onChange: (e: { target: { value: string } }) =>
                    setEditReminderTimeInput(e.target.value),
                  style: webInputStyle,
                })}
              </View>
            </View>
          ) : (
            <View className="mb-4 gap-2">
              {!editRecurring && (
                <>
                  <TouchableOpacity
                    testID="edit-reminder-date-open"
                    onPress={openEditReminderDatePicker}
                    className="rounded-xl px-4 py-3"
                    style={{
                      borderColor: theme.border,
                      borderWidth: 1,
                      backgroundColor: theme.surface,
                    }}>
                    <Text className="text-base" style={{ color: theme.text }}>
                      Reminder date: {formatDate(editReminderDateTime)}
                    </Text>
                  </TouchableOpacity>

                  <PickerSheet
                    visible={showEditReminderDatePicker}
                    title="Select reminder date"
                    testID="edit-reminder-date-picker-modal"
                    onClose={() => setShowEditReminderDatePicker(false)}
                    onConfirm={() => setShowEditReminderDatePicker(false)}>
                    <DateTimePicker
                      value={editReminderDateTime ?? new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeEditReminderDate}
                      {...nativePickerThemeProps}
                    />
                  </PickerSheet>
                </>
              )}

              <TouchableOpacity
                testID="edit-reminder-time-open"
                onPress={openEditReminderTimePicker}
                className="rounded-xl px-4 py-3"
                style={{
                  borderColor: theme.border,
                  borderWidth: 1,
                  backgroundColor: theme.surface,
                }}>
                <Text className="text-base" style={{ color: theme.text }}>
                  Reminder time: {formatTime(editReminderDateTime)}
                </Text>
              </TouchableOpacity>

              <PickerSheet
                visible={showEditReminderTimePicker}
                title="Select reminder time"
                testID="edit-reminder-time-picker-modal"
                onClose={() => setShowEditReminderTimePicker(false)}
                onConfirm={() => setShowEditReminderTimePicker(false)}>
                <DateTimePicker
                  value={editReminderDateTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChangeEditReminderTime}
                  {...nativePickerThemeProps}
                />
              </PickerSheet>
            </View>
          ))}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowEdit(false)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.surface,
            }}>
            <Text style={{ fontWeight: '600', color: theme.textMuted }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveEdit}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              backgroundColor: theme.primary,
              opacity: editTitle.trim() ? 1 : 0.6,
            }}
            disabled={!editTitle.trim()}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => setShowPaywall(false)}
      />
    </>
  );
}
