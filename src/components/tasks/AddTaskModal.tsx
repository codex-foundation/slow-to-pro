import { createElement, useState } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import type { Priority } from '@/models/task';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { useTaskStore } from '@/stores/taskStore';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'border-red-400 bg-red-50',
  medium: 'border-amber-400 bg-amber-50',
  low: 'border-green-400 bg-green-50',
};
const PRIORITY_ACTIVE: Record<Priority, string> = {
  high: 'bg-red-500 border-red-500',
  medium: 'bg-amber-400 border-amber-400',
  low: 'bg-green-500 border-green-500',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

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

export function AddTaskModal({ visible, onClose }: Props) {
  const router = useRouter();
  const addTask = useTaskStore((s) => s.addTask);
  const startWorkForTask = usePomodoroStore((s) => s.startWorkForTask);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [startFocusNow, setStartFocusNow] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDateInput, setDueDateInput] = useState(''); // web fallback
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState<Date | null>(null);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [reminderDateInput, setReminderDateInput] = useState(''); // web fallback
  const [reminderTimeInput, setReminderTimeInput] = useState('09:00'); // web fallback

  const hasDueDateValue = dueDate !== null || dueDateInput.trim().length > 0;
  const hasReminderValue =
    reminderEnabled ||
    reminderDateTime !== null ||
    reminderDateInput.trim().length > 0 ||
    reminderTimeInput !== '09:00';

  const toggleDay = (day: number) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

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

  const onChangeDueDate = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDueDatePicker(false);
    if (selected) setDueDate(selected);
  };

  const onChangeReminderDate = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowReminderDatePicker(false);
    if (!selected) return;
    setReminderDateTime((prev) => {
      const next = new Date(selected);
      if (prev) {
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      } else {
        next.setHours(9, 0, 0, 0);
      }
      return next;
    });
  };

  const onChangeReminderTime = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowReminderTimePicker(false);
    if (!selected) return;
    setReminderDateTime((prev) => {
      const base = prev ? new Date(prev) : new Date();
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return base;
    });
  };

  const clearDueDate = () => {
    setDueDate(null);
    setDueDateInput('');
    setShowDueDatePicker(false);
  };

  const clearReminder = () => {
    setReminderEnabled(false);
    setReminderDateTime(null);
    setReminderDateInput('');
    setReminderTimeInput('09:00');
    setShowReminderDatePicker(false);
    setShowReminderTimePicker(false);
  };

  const handleAdd = () => {
    if (!title.trim()) return;

    const dueDateMs =
      Platform.OS === 'web'
        ? parseDateToEndOfDay(dueDateInput)
        : dueDate
          ? new Date(dueDate).setHours(23, 59, 0, 0)
          : undefined;

    const reminderAtMs = reminderEnabled
      ? Platform.OS === 'web'
        ? parseReminderDateTime(reminderDateInput, reminderTimeInput)
        : reminderDateTime
          ? reminderDateTime.getTime()
          : undefined
      : undefined;

    if (reminderEnabled && !reminderAtMs) return;

    const taskId = addTask({
      title: title.trim(),
      priority,
      recurring: { enabled: recurring, days },
      dueDate: dueDateMs,
      reminderAt: reminderAtMs,
    });
    if (startFocusNow) {
      startWorkForTask(taskId);
    }
    setTitle('');
    setPriority('medium');
    setRecurring(false);
    setDays([]);
    setStartFocusNow(false);
    setDueDate(null);
    setShowDueDatePicker(false);
    setDueDateInput('');
    setReminderEnabled(false);
    setReminderDateTime(null);
    setShowReminderDatePicker(false);
    setShowReminderTimePicker(false);
    setReminderDateInput('');
    setReminderTimeInput('09:00');
    onClose();
    if (startFocusNow) {
      router.replace('/(tabs)/pomodoro');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Task">
      <TextInput
        testID="task-title-input"
        className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 mb-4"
        placeholder="What needs to be done?"
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />

      <Text className="text-sm font-medium text-gray-600 mb-2">Priority</Text>
      <View className="flex-row gap-2 mb-4">
        {PRIORITIES.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPriority(p)}
            className={`flex-1 py-2 rounded-lg border ${priority === p ? PRIORITY_ACTIVE[p] : PRIORITY_COLORS[p]}`}>
            <Text
              className={`text-center text-sm font-medium ${priority === p ? 'text-white' : 'text-gray-700'}`}>
              {PRIORITY_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-gray-600">Recurring task</Text>
        <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: '#6366f1' }} />
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-sm font-medium text-gray-600">Start focus immediately</Text>
        <Switch
          testID="start-focus-switch"
          value={startFocusNow}
          onValueChange={setStartFocusNow}
          trackColor={{ true: '#6366f1' }}
        />
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-600">Due date</Text>
        {hasDueDateValue ? (
          <TouchableOpacity onPress={clearDueDate}>
            <Text className="text-xs font-medium text-gray-400">Clear</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>
      {Platform.OS === 'web' ? (
        <View className="mb-4">
          {createElement('input', {
            type: 'date',
            value: dueDateInput,
            onChange: (e: { target: { value: string } }) => setDueDateInput(e.target.value),
            style: WEB_INPUT_STYLE,
          })}
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setShowDueDatePicker(true)}
            className="border border-gray-200 rounded-xl px-4 py-3 mb-4 bg-white">
            <Text className="text-base text-gray-800">{formatDate(dueDate)}</Text>
          </TouchableOpacity>
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onChangeDueDate}
            />
          )}
        </>
      )}

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-medium text-gray-600">Reminder</Text>
        <View className="flex-row items-center gap-3">
          {hasReminderValue ? (
            <TouchableOpacity onPress={clearReminder}>
              <Text className="text-xs font-medium text-gray-400">Clear</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: '#6366f1' }}
          />
        </View>
      </View>

      {reminderEnabled &&
        (Platform.OS === 'web' ? (
          <View className="flex-row gap-2 mb-4 items-center">
            <View className="flex-1">
              {createElement('input', {
                type: 'date',
                value: reminderDateInput,
                onChange: (e: { target: { value: string } }) => setReminderDateInput(e.target.value),
                style: WEB_INPUT_STYLE,
              })}
            </View>
            <View style={{ width: 120 }}>
              {createElement('input', {
                type: 'time',
                value: reminderTimeInput,
                onChange: (e: { target: { value: string } }) => setReminderTimeInput(e.target.value),
                style: WEB_INPUT_STYLE,
              })}
            </View>
          </View>
        ) : (
          <View className="mb-4 gap-2">
            <TouchableOpacity
              onPress={() => setShowReminderDatePicker(true)}
              className="border border-gray-200 rounded-xl px-4 py-3 bg-white">
              <Text className="text-base text-gray-800">
                Reminder date: {formatDate(reminderDateTime)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowReminderTimePicker(true)}
              className="border border-gray-200 rounded-xl px-4 py-3 bg-white">
              <Text className="text-base text-gray-800">
                Reminder time: {formatTime(reminderDateTime)}
              </Text>
            </TouchableOpacity>

            {showReminderDatePicker && (
              <DateTimePicker
                value={reminderDateTime ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onChangeReminderDate}
              />
            )}

            {showReminderTimePicker && (
              <DateTimePicker
                value={reminderDateTime ?? new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeReminderTime}
              />
            )}
          </View>
        ))}

      {recurring && (
        <View className="flex-row gap-1 mb-4 flex-wrap">
          {DAYS.map((label, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => toggleDay(i)}
              className={`w-10 h-10 rounded-full items-center justify-center ${days.includes(i) ? 'bg-indigo-500' : 'bg-gray-100'}`}>
              <Text
                className={`text-xs font-medium ${days.includes(i) ? 'text-white' : 'text-gray-600'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        testID="add-task-submit"
        onPress={handleAdd}
        className="bg-indigo-500 py-3.5 rounded-xl items-center mt-1"
        disabled={!title.trim()}>
        <Text className="text-white font-semibold text-base">
          {startFocusNow ? 'Add & Start Focus' : 'Add Task'}
        </Text>
      </TouchableOpacity>
    </Modal>
  );
}
