import { Text, TouchableOpacity, View } from 'react-native';
import type { Category, Expense } from '@/models/finance';
import { formatShortDate, formatTime } from '@/utils/date';

interface Props {
  expense: Expense;
  category?: Category;
  onDelete: () => void;
}

export function ExpenseItem({ expense, category, onDelete }: Props) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-50">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: (category?.color ?? '#94a3b8') + '22' }}>
        <Text className="text-base">💰</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: category?.color ?? '#94a3b8' }}
          />
          <Text className="text-sm font-medium text-gray-700">{category?.name ?? 'Unknown'}</Text>
        </View>
        {expense.note ? (
          <Text className="text-xs text-gray-400" numberOfLines={1}>
            {expense.note}
          </Text>
        ) : null}
        <Text className="text-xs text-gray-400">
          {formatShortDate(expense.date)} · {formatTime(expense.date)}
        </Text>
      </View>
      <Text className="text-base font-semibold text-gray-800 mr-3">
        ${expense.amount.toFixed(2)}
      </Text>
      <TouchableOpacity onPress={onDelete} className="p-1">
        <Text className="text-gray-300 text-lg">✕</Text>
      </TouchableOpacity>
    </View>
  );
}
