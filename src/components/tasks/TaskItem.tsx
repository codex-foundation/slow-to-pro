import { createElement, useRef, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import type { Priority, Task } from '@/models/task';
import { useTaskStore } from '@/stores/taskStore';
import { fireConfetti } from '@/utils/confetti';
import { Modal } from '../ui/Modal';
import { PriorityBadge } from './PriorityBadge';

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

const WEB_INPUT_STYLE = {
  width: '100%',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 12,
  padding: 12,
  fontSize: 16,
  color: '#1f2937',
  backgroundColor: '#ffffff',
};

interface Props {
  item: Task;
  drag?: () => void;
  isActive?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TaskItem({ item, drag, isActive = false, onMoveUp, onMoveDown }: Props) {
  const { toggleTask, deleteTask, updateTask } = useTaskStore();
  const [showEdit, setShowEdit] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);

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
    setShowEditDueDatePicker(false);
    if (selected) setEditDueDate(selected);
  };

  const onChangeEditReminderDate = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowEditReminderDatePicker(false);
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
    setShowEditReminderTimePicker(false);
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
      if (Platform.OS === 'web') {
        fireConfetti();
      } else {
        confettiRef.current?.start();
      }
    }

    toggleTask(item.id);
  };

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify().damping(15).stiffness(100)}
      style={itemAnimatedStyle}
      className={`flex-row items-center px-4 py-3 bg-white border-b border-gray-100 ${isActive ? 'opacity-80 shadow-md' : ''}`}>
      {drag ? (
        <TouchableOpacity onLongPress={drag} className="pr-3 py-1">
          <Ionicons name="reorder-three-outline" size={20} color="#9ca3af" />
        </TouchableOpacity>
      ) : (
        <View className="pr-3 py-1 flex-row gap-1">
          <TouchableOpacity onPress={onMoveUp} disabled={!onMoveUp}>
            <Ionicons
              name="chevron-up-outline"
              size={18}
              color={onMoveUp ? '#9ca3af' : '#e5e7eb'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMoveDown} disabled={!onMoveDown}>
            <Ionicons
              name="chevron-down-outline"
              size={18}
              color={onMoveDown ? '#9ca3af' : '#e5e7eb'}
            />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={handleToggle} className="pr-3">
        <Animated.View
          style={checkboxAnimatedStyle}
          className={`w-5 h-5 rounded border-2 items-center justify-center ${item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
          {item.completed && <Ionicons name="checkmark" size={12} color="white" />}
        </Animated.View>
      </TouchableOpacity>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className={`flex-1 text-base ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
            numberOfLines={2}>
            {item.title}
          </Text>
          <PriorityBadge priority={item.priority} />
          {item.recurring.enabled && <Ionicons name="repeat-outline" size={14} color="#9ca3af" />}
        </View>

        {(dueDateText || reminderText) && (
          <View className="mt-1 gap-0.5">
            {dueDateText && <Text className="text-xs text-gray-500">Due: {dueDateText}</Text>}
            {reminderText && (
              <Text className="text-xs text-gray-500">Reminder: {reminderText}</Text>
            )}
          </View>
        )}
      </View>

      <View className="flex-row items-center">
        {!item.completed && (
          <TouchableOpacity onPress={openEdit} className="pl-2 py-1">
            <Ionicons name="create-outline" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => deleteTask(item.id)} className="pl-3 py-1">
          <Ionicons name="trash-outline" size={18} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      <Modal visible={showEdit} onClose={() => setShowEdit(false)} title="Edit task">
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4"
          value={editTitle}
          onChangeText={setEditTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveEdit}
        />

        <Text className="text-sm font-medium text-gray-600 mb-2">Priority</Text>
        <View className="flex-row gap-2 mb-4">
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setEditPriority(p)}
              className={`flex-1 py-2 rounded-lg border ${editPriority === p ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-200'}`}>
              <Text
                className={`text-center text-sm font-medium ${editPriority === p ? 'text-white' : 'text-gray-700'}`}>
                {PRIORITY_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600">Due date</Text>
          {(editDueDate !== null || editDueDateInput.trim().length > 0) && (
            <TouchableOpacity onPress={clearEditDueDate}>
              <Text className="text-xs font-medium text-gray-400">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {Platform.OS === 'web' ? (
          <View className="mb-4">
            {createElement('input', {
              type: 'date',
              value: editDueDateInput,
              onChange: (e: { target: { value: string } }) => setEditDueDateInput(e.target.value),
              style: WEB_INPUT_STYLE,
            })}
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setShowEditDueDatePicker(true)}
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 bg-white">
              <Text className="text-base text-gray-800">{formatDate(editDueDate)}</Text>
            </TouchableOpacity>
            {showEditDueDatePicker && (
              <DateTimePicker
                value={editDueDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onChangeEditDueDate}
              />
            )}
          </>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-medium text-gray-600">Reminder</Text>
          <View className="flex-row items-center gap-3">
            {(editReminderEnabled ||
              editReminderDateTime !== null ||
              editReminderDateInput.trim().length > 0 ||
              editReminderTimeInput !== '09:00') && (
              <TouchableOpacity onPress={clearEditReminder}>
                <Text className="text-xs font-medium text-gray-400">Clear</Text>
              </TouchableOpacity>
            )}
            <Switch
              value={editReminderEnabled}
              onValueChange={setEditReminderEnabled}
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
                  style: WEB_INPUT_STYLE,
                })}
              </View>
              <View style={{ width: 120 }}>
                {createElement('input', {
                  type: 'time',
                  value: editReminderTimeInput,
                  onChange: (e: { target: { value: string } }) =>
                    setEditReminderTimeInput(e.target.value),
                  style: WEB_INPUT_STYLE,
                })}
              </View>
            </View>
          ) : (
            <View className="mb-4 gap-2">
              <TouchableOpacity
                onPress={() => setShowEditReminderDatePicker(true)}
                className="border border-gray-200 rounded-xl px-4 py-3 bg-white">
                <Text className="text-base text-gray-800">
                  Reminder date: {formatDate(editReminderDateTime)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowEditReminderTimePicker(true)}
                className="border border-gray-200 rounded-xl px-4 py-3 bg-white">
                <Text className="text-base text-gray-800">
                  Reminder time: {formatTime(editReminderDateTime)}
                </Text>
              </TouchableOpacity>

              {showEditReminderDatePicker && (
                <DateTimePicker
                  value={editReminderDateTime ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onChangeEditReminderDate}
                />
              )}

              {showEditReminderTimePicker && (
                <DateTimePicker
                  value={editReminderDateTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChangeEditReminderTime}
                />
              )}
            </View>
          ))}

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowEdit(false)}
            className="flex-1 border border-gray-200 py-3 rounded-xl items-center">
            <Text className="text-gray-600 font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveEdit}
            className="flex-1 bg-indigo-500 py-3 rounded-xl items-center"
            disabled={!editTitle.trim()}>
            <Text className="text-white font-semibold">Save</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {Platform.OS !== 'web' && (
        <ConfettiCannon
          ref={confettiRef}
          count={50}
          origin={{ x: 0, y: 0 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2000}
        />
      )}
    </Animated.View>
  );
}
