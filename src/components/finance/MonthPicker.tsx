import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { monthLabel } from '@/utils/historyUtils';

interface Props {
  month: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
}

export function MonthPicker({ month, onPrev, onNext, disableNext }: Props) {
  const theme = useAppTheme();
  return (
    <View
      testID="month-picker"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 10,
      }}>
      <TouchableOpacity
        testID="month-picker-prev"
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        style={{ padding: 8 }}>
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
      </TouchableOpacity>
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, letterSpacing: -0.2 }}>
        {monthLabel(month)}
      </Text>
      <TouchableOpacity
        testID="month-picker-next"
        onPress={onNext}
        disabled={disableNext}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        style={{ padding: 8, opacity: disableNext ? 0.5 : 1 }}>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={disableNext ? theme.textSubtle : theme.primary}
        />
      </TouchableOpacity>
    </View>
  );
}
