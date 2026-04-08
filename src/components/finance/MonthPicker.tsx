import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { monthLabel } from '@/utils/historyUtils';

interface Props {
  month: string; // 'YYYY-MM'
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean; // true when already at the newest available month
}

export function MonthPicker({ month, onPrev, onNext, disableNext }: Props) {
  const theme = useAppTheme();
  return (
    <View className="flex-row items-center justify-between px-1 py-2">
      <TouchableOpacity testID="month-picker-prev" onPress={onPrev} className="p-2">
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
      </TouchableOpacity>
      <Text className="text-sm font-semibold" style={{ color: theme.text }}>
        {monthLabel(month)}
      </Text>
      <TouchableOpacity
        testID="month-picker-next"
        onPress={onNext}
        disabled={disableNext}
        className="p-2">
        <Ionicons
          name="chevron-forward"
          size={20}
          color={disableNext ? theme.textSubtle : theme.primary}
        />
      </TouchableOpacity>
    </View>
  );
}
