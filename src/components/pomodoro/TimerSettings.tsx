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

  const inputStyle = {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderColor: theme.border,
    borderWidth: 1,
    backgroundColor: theme.surface,
    color: theme.text,
  } as const;

  const labelStyle = {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: theme.textSubtle,
    marginBottom: 8,
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Timer settings">
      <View style={{ gap: 16 }}>
        <View>
          <Text style={labelStyle}>Focus duration (minutes)</Text>
          <TextInput
            value={focusInput}
            onChangeText={setFocusInput}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <View>
          <Text style={labelStyle}>Break duration (minutes)</Text>
          <TextInput
            value={breakInput}
            onChangeText={setBreakInput}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: 'center',
            backgroundColor: theme.primary,
            marginTop: 4,
          }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Save</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
