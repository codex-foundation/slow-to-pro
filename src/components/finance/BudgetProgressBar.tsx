import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Category } from '@/models/finance';

interface Props {
  category: Category;
  spent: number;
  limit: number;
}

export function BudgetProgressBar({ category, spent, limit }: Props) {
  const theme = useAppTheme();
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
    <View style={{ paddingVertical: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: category.color }}
          />
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textMuted }}>
            {category.name}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: overBudget ? theme.danger : theme.textMuted,
            fontVariant: ['tabular-nums'],
          }}>
          ${spent.toFixed(0)}
          {hasLimit ? ` / $${limit.toFixed(0)}` : ''}
        </Text>
      </View>
      {hasLimit && (
        <View
          style={{
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: theme.surfaceMuted,
          }}>
          <Animated.View
            style={[
              {
                height: '100%',
                width: '100%',
                borderRadius: 3,
                backgroundColor: overBudget ? theme.danger : category.color,
              },
              progressStyle,
            ]}
          />
        </View>
      )}
    </View>
  );
}
