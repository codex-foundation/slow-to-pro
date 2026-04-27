import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { radii } from './tokens';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function PillGroup<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surfaceMuted,
        borderRadius: radii.pill,
        padding: 4,
        alignSelf: 'flex-start',
      }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: radii.pill,
              backgroundColor: active ? theme.surface : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? theme.text : theme.textSubtle,
              }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
