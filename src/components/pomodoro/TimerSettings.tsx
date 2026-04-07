import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePomodoroStore } from '@/stores/pomodoroStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function TimerSettings({ visible, onClose }: Props) {
  const theme = useAppTheme();
  const workDuration = usePomodoroStore((s) => s.workDuration);
  const breakDuration = usePomodoroStore((s) => s.breakDuration);
  const updateDurations = usePomodoroStore((s) => s.updateDurations);

  const [focusInput, setFocusInput] = useState(String(workDuration));
  const [breakInput, setBreakInput] = useState(String(breakDuration));

  useEffect(() => {
    if (visible) {
      setFocusInput(String(workDuration));
      setBreakInput(String(breakDuration));
    }
  }, [visible, workDuration, breakDuration]);

  const handleSave = () => {
    const parsedFocus = parseInt(focusInput, 10);
    const parsedBreak = parseInt(breakInput, 10);
    const work = Number.isNaN(parsedFocus) ? workDuration : Math.min(60, Math.max(1, parsedFocus));
    const breakMins = Number.isNaN(parsedBreak)
      ? breakDuration
      : Math.min(60, Math.max(1, parsedBreak));
    updateDurations(work, breakMins);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Timer settings">
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium mb-1" style={{ color: theme.textMuted }}>
            Focus duration (minutes)
          </Text>
          <TextInput
            value={focusInput}
            onChangeText={setFocusInput}
            keyboardType="number-pad"
            className="rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.surface,
              color: theme.text,
            }}
          />
        </View>

        <View>
          <Text className="text-sm font-medium mb-1" style={{ color: theme.textMuted }}>
            Break duration (minutes)
          </Text>
          <TextInput
            value={breakInput}
            onChangeText={setBreakInput}
            keyboardType="number-pad"
            className="rounded-xl px-4 py-3 text-base"
            style={{
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.surface,
              color: theme.text,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: theme.primary }}>
          <Text className="font-semibold text-white">Save</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
