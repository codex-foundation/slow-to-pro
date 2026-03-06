import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Category } from '@/models/finance';

interface Props {
  category: Category;
  spent: number;
  limit: number;
}

export function BudgetProgressBar({ category, spent, limit }: Props) {
  const hasLimit = limit > 0;
  const pct = hasLimit ? Math.min(spent / limit, 1) : 0;
  const overBudget = hasLimit && spent > limit;
  const progress = useSharedValue(pct);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 350 });
  }, [pct, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
          <Text className="text-sm font-medium text-gray-700">{category.name}</Text>
        </View>
        <Text className={`text-sm font-semibold ${overBudget ? 'text-red-500' : 'text-gray-600'}`}>
          ${spent.toFixed(0)}
          {hasLimit ? ` / $${limit.toFixed(0)}` : ''}
        </Text>
      </View>
      {hasLimit && (
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <Animated.View
            className="h-full rounded-full"
            style={[
              {
                width: '100%',
                backgroundColor: overBudget ? '#ef4444' : category.color,
              },
              progressStyle,
            ]}
          />
        </View>
      )}
    </View>
  );
}
