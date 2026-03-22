import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type Theme = ReturnType<typeof useAppTheme>;

export function CheckboxRow({
  testID,
  checked,
  onToggle,
  label,
  theme,
}: {
  testID?: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: checked ? theme.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        }}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 14, flex: 1 }}>{label}</Text>
    </TouchableOpacity>
  );
}
