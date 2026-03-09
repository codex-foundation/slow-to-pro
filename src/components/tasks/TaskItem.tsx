import { createElement, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Modal as RNModal,
  Platform,
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
import { useTaskStore } from '@/stores/taskStore';
import { Modal } from '../ui/Modal';

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
            className="px-3 py-2 rounded-lg bg-indigo-500">
            <Text className="text-sm font-semibold text-white">Done</Text>
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onCompleted?: () => void;
}

export function TaskItem({
  item,
  drag,
  isActive = false,
  onMoveUp,
  onMoveDown,
  onCompleted,
}: Props) {
  const theme = useAppTheme();
  const { toggleTask, deleteTask, updateTask } = useTaskStore();
  const [showEdit, setShowEdit] = useState(false);

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

    setShowEdit(true);
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
        ? parseReminderDateTime(editReminderDateInput, editReminderTimeInput)
        : editReminderDateTime
          ? editReminderDateTime.getTime()
          : undefined
      : undefined;

    if (editReminderEnabled && !reminderAtMs) return;

    updateTask(item.id, {
      title: next,
      priority: editPriority,
      dueDate: dueDateMs,
      reminderAt: reminderAtMs,
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

  const getPriorityBorderColor = (priority: Priority): string => {
    if (priority === 'high') return theme.danger;
    if (priority === 'low') return theme.success;
    return '#f59e0b';
  };

  const renderSwipeActions = () => (
    <View className="flex-row items-stretch">
      {!item.completed && (
        <TouchableOpacity
          testID="edit-task-open"
          onPress={openEdit}
          className="w-20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={`Edit task ${item.title}`}
          accessibilityHint="Opens task edit form"
          style={{ backgroundColor: theme.primarySoft }}>
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
        style={{ backgroundColor: '#fee2e2' }}>
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

  const rowContent = (
    <Animated.View
      testID="task-item-row"
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify().damping(15).stiffness(100)}
      style={[
        itemAnimatedStyle,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
          borderRightColor: getPriorityBorderColor(item.priority),
          borderRightWidth: 4,
          opacity: isActive ? 0.8 : 1,
        },
      ]}
      className="flex-row items-center px-4 py-3">
      {drag ? (
        <TouchableOpacity
          onLongPress={drag}
          className="pr-3 py-1"
          accessibilityRole="button"
          accessibilityLabel={`Reorder task ${item.title}`}
          accessibilityHint="Long press and drag to reorder this task">
          <Ionicons name="reorder-three-outline" size={18} color={theme.textSubtle} />
        </TouchableOpacity>
      ) : (
        <View className="pr-3 py-1 flex-row gap-1">
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!onMoveUp}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} up`}
            accessibilityHint="Moves this task one position up">
            <Ionicons
              name="chevron-up"
              size={16}
              color={onMoveUp ? theme.textSubtle : theme.border}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!onMoveDown}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} down`}
            accessibilityHint="Moves this task one position down">
            <Ionicons
              name="chevron-down"
              size={16}
              color={onMoveDown ? theme.textSubtle : theme.border}
            />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={handleToggle}
        className="pr-3"
        accessibilityRole="checkbox"
        accessibilityLabel={item.title}
        accessibilityState={{ checked: item.completed }}
        accessibilityHint={item.completed ? 'Marks task as incomplete' : 'Marks task as complete'}>
        <Animated.View
          className="w-5 h-5 rounded border-2 items-center justify-center"
          style={[
            checkboxAnimatedStyle,
            {
              backgroundColor: item.completed ? theme.primary : 'transparent',
              borderColor: item.completed ? theme.primary : theme.border,
            },
          ]}>
          {item.completed && <Ionicons name="checkmark" size={12} color="#fff" />}
        </Animated.View>
      </TouchableOpacity>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-base"
            style={{
              textDecorationLine: item.completed ? 'line-through' : 'none',
              color: item.completed ? theme.textSubtle : theme.text,
            }}
            numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        {(item.recurring.enabled || dueDateText || reminderText) && (
          <View className="mt-1 gap-0.5">
            {item.recurring.enabled && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="repeat" size={13} color={theme.textSubtle} />
                <Text className="text-xs" style={{ color: theme.textSubtle }}>
                  Recurring
                </Text>
              </View>
            )}
            {dueDateText && (
              <Text className="text-xs" style={{ color: theme.textSubtle }}>
                Due: {dueDateText}
              </Text>
            )}
            {reminderText && (
              <Text className="text-xs" style={{ color: theme.textSubtle }}>
                Reminder: {reminderText}
              </Text>
            )}
          </View>
        )}
      </View>

      {Platform.OS === 'web' && (
        <View className="flex-row items-center">
          {!item.completed && (
            <TouchableOpacity
              onPress={openEdit}
              testID="edit-task-open"
              className="pl-2 py-1"
              accessibilityRole="button"
              accessibilityLabel={`Edit task ${item.title}`}
              accessibilityHint="Opens task edit form">
              <Ionicons name="create-outline" size={16} color={theme.textSubtle} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => deleteTask(item.id)}
            className="pl-3 py-1"
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
          onSubmitEditing={saveEdit}
        />

        <Text className="text-sm font-medium mb-2" style={{ color: theme.textMuted }}>
          Priority
        </Text>
        <View className="flex-row gap-2 mb-4">
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setEditPriority(p)}
              className="flex-1 py-2 rounded-lg border"
              style={{
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

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
            Due date
          </Text>
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
          <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
            Reminder
          </Text>
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
              onValueChange={enableEditReminder}
              trackColor={{ true: '#6366f1' }}
            />
          </View>
        </View>

        {editReminderEnabled &&
          (Platform.OS === 'web' ? (
            <View className="flex-row gap-2 mb-4 items-center">
              <View className="flex-1">
                {createElement('input', {
                  type: 'date',
                  value: editReminderDateInput,
                  onChange: (e: { target: { value: string } }) =>
                    setEditReminderDateInput(e.target.value),
                  style: webInputStyle,
                })}
              </View>
              <View style={{ width: 120 }}>
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

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowEdit(false)}
            className="flex-1 py-3 rounded-xl items-center"
            style={{ borderColor: theme.border, borderWidth: 1, backgroundColor: theme.surface }}>
            <Text className="font-semibold" style={{ color: theme.textMuted }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveEdit}
            className="flex-1 py-3 rounded-xl items-center"
            style={{ backgroundColor: theme.primary }}
            disabled={!editTitle.trim()}>
            <Text className="text-white font-semibold">Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
