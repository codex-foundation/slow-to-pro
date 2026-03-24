import { createElement, useState } from 'react';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  Modal as RNModal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Priority } from '@/models/task';
import { useEntitlementStore } from '@/stores/entitlementStore';
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

export function AddTaskModal({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const isPro = useEntitlementStore((s) => s.isPro);
  const addTask = useTaskStore((s) => s.addTask);
  const categories = useTaskStore((s) => s.categories);
  const startWorkForTask = usePomodoroStore((s) => s.startWorkForTask);
  const [showPaywall, setShowPaywall] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
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

  const webInputStyle = {
    ...WEB_INPUT_STYLE,
    borderColor: theme.border,
    color: theme.text,
    backgroundColor: theme.surface,
  };

  const nativePickerThemeProps =
    Platform.OS === 'ios'
      ? {
          themeVariant: theme.isDark ? ('dark' as const) : ('light' as const),
          textColor: theme.text,
        }
      : {};

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
    if (selected) setDueDate(selected);
  };

  const onChangeReminderDate = (_event: DateTimePickerEvent, selected?: Date) => {
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

  const openDueDatePicker = () => {
    if (!dueDate) {
      const now = new Date();
      now.setHours(23, 59, 0, 0);
      setDueDate(now);
    }
    setShowDueDatePicker(true);
  };

  const enableReminder = (enabled: boolean) => {
    setReminderEnabled(enabled);
    if (enabled && !reminderDateTime && Platform.OS !== 'web') {
      const next = new Date();
      next.setSeconds(0, 0);
      setReminderDateTime(next);
    }
  };

  const openReminderDatePicker = () => {
    if (!reminderDateTime) {
      const next = new Date();
      next.setSeconds(0, 0);
      setReminderDateTime(next);
    }
    setShowReminderDatePicker(true);
  };

  const openReminderTimePicker = () => {
    if (!reminderDateTime) {
      const next = new Date();
      next.setSeconds(0, 0);
      setReminderDateTime(next);
    }
    setShowReminderTimePicker(true);
  };

  const buildTaskPayload = () => {
    const dueDateMs =
      Platform.OS === 'web'
        ? parseDateToEndOfDay(dueDateInput)
        : dueDate
          ? new Date(dueDate).setHours(23, 59, 0, 0)
          : undefined;

    const reminderAtMs = reminderEnabled
      ? Platform.OS === 'web'
        ? parseReminderDateTime(
            recurring ? new Date().toISOString().slice(0, 10) : reminderDateInput,
            reminderTimeInput
          )
        : reminderDateTime
          ? reminderDateTime.getTime()
          : undefined
      : undefined;

    return { dueDateMs, reminderAtMs };
  };

  const resetForm = () => {
    setTitle('');
    setCategoryId(null);
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
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    const { dueDateMs, reminderAtMs } = buildTaskPayload();
    if (reminderEnabled && !reminderAtMs) return;
    const taskId = addTask({
      title: title.trim(),
      priority,
      categoryId: categoryId ?? undefined,
      recurring: { enabled: recurring, days },
      dueDate: dueDateMs,
      reminderAt: reminderAtMs,
    });
    if (startFocusNow) startWorkForTask(taskId);
    resetForm();
    onClose();
    if (startFocusNow) router.replace('/(tabs)/pomodoro');
  };

  const handleAddAnother = () => {
    if (!title.trim()) return;
    const { dueDateMs, reminderAtMs } = buildTaskPayload();
    if (reminderEnabled && !reminderAtMs) return;
    addTask({
      title: title.trim(),
      priority,
      categoryId: categoryId ?? undefined,
      recurring: { enabled: recurring, days },
      dueDate: dueDateMs,
      reminderAt: reminderAtMs,
    });
    resetForm();
  };

  return (
    <>
      <Modal visible={visible} onClose={onClose} title="New Task">
        <TextInput
          testID="task-title-input"
          className="border rounded-xl px-4 py-3 text-base mb-4"
          placeholder="What needs to be done?"
          placeholderTextColor={theme.textSubtle}
          style={{
            borderColor: theme.border,
            color: theme.text,
            backgroundColor: theme.surface,
          }}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
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
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-medium text-gray-600">Recurring task</Text>
            {!isPro && <Ionicons name="lock-closed-outline" size={12} color={theme.textSubtle} />}
          </View>
          <Switch
            testID="recurring-enabled-switch"
            value={recurring}
            onValueChange={(v) => {
              if (!isPro) {
                setShowPaywall(true);
                return;
              }
              setRecurring(v);
            }}
            trackColor={{ true: '#6366f1' }}
          />
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
              style: webInputStyle,
            })}
          </View>
        ) : (
          <>
            <TouchableOpacity
              testID="due-date-open"
              onPress={openDueDatePicker}
              className="border rounded-xl px-4 py-3 mb-4"
              style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-base" style={{ color: theme.text }}>
                {formatDate(dueDate)}
              </Text>
            </TouchableOpacity>

            <PickerSheet
              visible={showDueDatePicker}
              title="Select due date"
              testID="due-date-picker-modal"
              onClose={() => setShowDueDatePicker(false)}
              onConfirm={() => setShowDueDatePicker(false)}>
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDueDate}
                {...nativePickerThemeProps}
              />
            </PickerSheet>
          </>
        )}

        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-medium text-gray-600">Reminder</Text>
            {!isPro && <Ionicons name="lock-closed-outline" size={12} color={theme.textSubtle} />}
          </View>
          <View className="flex-row items-center gap-3">
            {hasReminderValue ? (
              <TouchableOpacity onPress={clearReminder}>
                <Text className="text-xs font-medium text-gray-400">Clear</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <Switch
              testID="reminder-enabled-switch"
              value={reminderEnabled}
              onValueChange={(v) => {
                if (!isPro) {
                  setShowPaywall(true);
                  return;
                }
                enableReminder(v);
              }}
              trackColor={{ true: '#6366f1' }}
            />
          </View>
        </View>

        {reminderEnabled &&
          (Platform.OS === 'web' ? (
            <View className="flex-row gap-2 mb-4 items-center">
              {!recurring && (
                <View className="flex-1">
                  {createElement('input', {
                    type: 'date',
                    value: reminderDateInput,
                    onChange: (e: { target: { value: string } }) =>
                      setReminderDateInput(e.target.value),
                    style: webInputStyle,
                  })}
                </View>
              )}
              <View style={recurring ? { flex: 1 } : { width: 120 }}>
                {createElement('input', {
                  type: 'time',
                  value: reminderTimeInput,
                  onChange: (e: { target: { value: string } }) =>
                    setReminderTimeInput(e.target.value),
                  style: webInputStyle,
                })}
              </View>
            </View>
          ) : (
            <View className="mb-4 gap-2">
              {!recurring && (
                <>
                  <TouchableOpacity
                    testID="reminder-date-open"
                    onPress={openReminderDatePicker}
                    className="border rounded-xl px-4 py-3"
                    style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                    <Text className="text-base" style={{ color: theme.text }}>
                      Reminder date: {formatDate(reminderDateTime)}
                    </Text>
                  </TouchableOpacity>

                  <PickerSheet
                    visible={showReminderDatePicker}
                    title="Select reminder date"
                    testID="reminder-date-picker-modal"
                    onClose={() => setShowReminderDatePicker(false)}
                    onConfirm={() => setShowReminderDatePicker(false)}>
                    <DateTimePicker
                      value={reminderDateTime ?? new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onChangeReminderDate}
                      {...nativePickerThemeProps}
                    />
                  </PickerSheet>
                </>
              )}

              <TouchableOpacity
                testID="reminder-time-open"
                onPress={openReminderTimePicker}
                className="border rounded-xl px-4 py-3"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <Text className="text-base" style={{ color: theme.text }}>
                  Reminder time: {formatTime(reminderDateTime)}
                </Text>
              </TouchableOpacity>

              <PickerSheet
                visible={showReminderTimePicker}
                title="Select reminder time"
                testID="reminder-time-picker-modal"
                onClose={() => setShowReminderTimePicker(false)}
                onConfirm={() => setShowReminderTimePicker(false)}>
                <DateTimePicker
                  value={reminderDateTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onChangeReminderTime}
                  {...nativePickerThemeProps}
                />
              </PickerSheet>
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

        {categories.length > 0 && (
          <>
            <Text className="text-sm font-medium text-gray-600 mb-2">Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity
                testID="category-none"
                onPress={() => setCategoryId(null)}
                className="px-3 py-1.5 rounded-full border"
                style={{
                  backgroundColor: categoryId === null ? theme.primary : theme.surface,
                  borderColor: categoryId === null ? theme.primary : theme.border,
                }}>
                <Text
                  className="text-xs font-medium"
                  style={{ color: categoryId === null ? '#fff' : theme.textMuted }}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  testID={`category-chip-${cat.id}`}
                  onPress={() => setCategoryId(cat.id)}
                  className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: categoryId === cat.id ? cat.color + '22' : theme.surface,
                    borderColor: categoryId === cat.id ? cat.color : theme.border,
                  }}>
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }}
                  />
                  <Text
                    className="text-xs font-medium"
                    style={{ color: categoryId === cat.id ? cat.color : theme.textMuted }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View className="flex-row gap-2 mt-1">
          <TouchableOpacity
            testID="add-task-submit"
            onPress={handleAdd}
            className="flex-1 bg-indigo-500 py-3.5 rounded-xl items-center"
            style={{ opacity: title.trim() ? 1 : 0.55 }}
            disabled={!title.trim()}>
            <Text className="text-white font-semibold text-base">
              {startFocusNow ? 'Add & Start Focus' : 'Add Task'}
            </Text>
          </TouchableOpacity>
          {!startFocusNow && (
            <TouchableOpacity
              testID="add-task-submit-another"
              onPress={handleAddAnother}
              className="rounded-xl px-4 py-3.5 items-center"
              style={{
                borderWidth: 1,
                borderColor: title.trim() ? theme.primary : theme.border,
                opacity: title.trim() ? 1 : 0.55,
              }}
              disabled={!title.trim()}>
              <Text
                className="font-semibold text-base"
                style={{ color: title.trim() ? theme.primary : theme.textSubtle }}>
                + Another
              </Text>
            </TouchableOpacity>
          )}
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
