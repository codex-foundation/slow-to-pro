import { useEffect } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Category } from '@/models/finance';
import { getTheme } from '@/utils/theme';

interface Props {
  category: Category;
  spent: number;
  limit: number;
}

export function BudgetProgressBar({ category, spent, limit }: Props) {
  const theme = getTheme(useColorScheme());
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
    <View
      className="mb-3 rounded-xl px-3 py-2"
      style={{ backgroundColor: theme.surfaceMuted, borderColor: theme.border, borderWidth: 1 }}>
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
          <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
            {category.name}
          </Text>
        </View>
        <Text
          className="text-sm font-semibold"
          style={{ color: overBudget ? theme.danger : theme.textMuted }}>
          ${spent.toFixed(0)}
          {hasLimit ? ` / $${limit.toFixed(0)}` : ''}
        </Text>
      </View>
      {hasLimit && (
        <View
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.surface }}>
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
