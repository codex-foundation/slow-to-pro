import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Category, Expense } from '@/models/finance';
import { formatShortDate, formatTime } from '@/utils/date';

interface Props {
  expense: Expense;
  category?: Category;
  onDelete: () => void;
}

export function ExpenseItem({ expense, category, onDelete }: Props) {
  const theme = useAppTheme();

  return (
    <Animated.View
      entering={FadeInRight.duration(250)}
      exiting={FadeOutLeft.duration(200)}
      layout={Layout.springify().damping(16).stiffness(130)}
      className="flex-row items-center py-3 border-b"
      style={{ borderBottomColor: theme.border }}>
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: (category?.color ?? '#94a3b8') + '22' }}>
        <Ionicons name="wallet-outline" size={18} color={category?.color ?? theme.textSubtle} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: category?.color ?? '#94a3b8' }}
          />
          <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
            {category?.name ?? 'Unknown'}
          </Text>
        </View>
        {expense.note ? (
          <Text className="text-xs" style={{ color: theme.textSubtle }} numberOfLines={1}>
            {expense.note}
          </Text>
        ) : null}
        <Text className="text-xs" style={{ color: theme.textSubtle }}>
          {formatShortDate(expense.date)} · {formatTime(expense.date)}
        </Text>
      </View>
      <Text className="text-base font-semibold mr-3" style={{ color: theme.text }}>
        ${expense.amount.toFixed(2)}
      </Text>
      <TouchableOpacity
        onPress={onDelete}
        className="p-1"
        accessibilityRole="button"
        accessibilityLabel="Delete expense"
        accessibilityHint="Removes this expense entry">
        <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
      </TouchableOpacity>
    </Animated.View>
  );
}
