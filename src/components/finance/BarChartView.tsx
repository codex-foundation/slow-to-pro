import { useMemo } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Category } from '@/models/finance';

interface Props {
  categories: Category[];
  spentByCategory: (id: string) => number;
  type: 'bar' | 'pie';
}

export function BarChartView({ categories, spentByCategory, type }: Props) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - 64);
  const shouldUseIosFallback = Platform.OS === 'ios';

  const spendingData = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, spent: spentByCategory(c.id) }))
        .filter((c) => Number.isFinite(c.spent) && c.spent > 0),
    [categories, spentByCategory]
  );

  if (spendingData.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-sm" style={{ color: theme.textSubtle }}>
          No spending data this month
        </Text>
      </View>
    );
  }

  const total = spendingData.reduce((sum, c) => sum + c.spent, 0);
  const maxSpent = Math.max(...spendingData.map((c) => c.spent));

  if (shouldUseIosFallback) {
    if (type === 'bar') {
      return (
        <View
          testID="finance-bar-chart"
          className="rounded-2xl p-4"
          style={{
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.border,
            borderWidth: 1,
          }}>
          <View className="flex-row items-end" style={{ height: 170 }}>
            {spendingData.map((c) => {
              const heightRatio = maxSpent > 0 ? c.spent / maxSpent : 0;
              return (
                <View key={c.id} className="items-center mr-3" style={{ width: 44 }}>
                  <View
                    style={{
                      width: 28,
                      height: Math.max(10, Math.round(140 * heightRatio)),
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      backgroundColor: c.color,
                    }}
                  />
                  <Text className="text-[10px] mt-2" style={{ color: theme.textMuted }}>
                    {c.name.slice(0, 4)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View
        testID="finance-pie-chart"
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.surfaceMuted,
          borderColor: theme.border,
          borderWidth: 1,
        }}>
        <View className="mb-3 items-center">
          <Text className="text-xs" style={{ color: theme.textSubtle }}>
            Total
          </Text>
          <Text className="text-base font-bold" style={{ color: theme.text }}>
            ${total.toFixed(0)}
          </Text>
        </View>
        <View className="gap-2">
          {spendingData.map((c) => {
            const ratio = total > 0 ? c.spent / total : 0;
            return (
              <View key={c.id}>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs" style={{ color: theme.textMuted }}>
                    {c.name}
                  </Text>
                  <Text className="text-xs" style={{ color: theme.textMuted }}>
                    {(ratio * 100).toFixed(0)}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: theme.surface,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${Math.max(4, ratio * 100)}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (type === 'bar') {
    const barData = spendingData.map((c) => ({
      value: c.spent,
      label: c.name.slice(0, 4),
      frontColor: c.color,
    }));

    return (
      <View
        className="rounded-2xl p-4"
        style={{
          backgroundColor: theme.surfaceMuted,
          borderColor: theme.border,
          borderWidth: 1,
        }}>
        <BarChart
          testID="finance-bar-chart"
          data={barData}
          width={chartWidth}
          height={180}
          barWidth={36}
          spacing={12}
          roundedTop
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: theme.textSubtle, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: theme.textMuted, fontSize: 10 }}
          noOfSections={4}
        />
      </View>
    );
  }

  const pieData = spendingData.map((c) => ({
    value: c.spent,
    color: c.color,
    text: c.name.slice(0, 4),
  }));

  return (
    <View
      className="rounded-2xl p-4 items-center"
      style={{
        backgroundColor: theme.surfaceMuted,
        borderColor: theme.border,
        borderWidth: 1,
      }}>
      <PieChart
        testID="finance-pie-chart"
        data={pieData}
        donut
        radius={90}
        innerRadius={55}
        innerCircleColor={theme.surfaceMuted}
        strokeColor={theme.surfaceMuted}
        textColor={theme.textMuted}
        centerLabelComponent={() => (
          <View className="items-center">
            <Text className="text-xs" style={{ color: theme.textSubtle }}>
              Total
            </Text>
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              ${total.toFixed(0)}
            </Text>
          </View>
        )}
      />
      <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4">
        {spendingData.map((c) => (
          <View key={c.id} className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <Text className="text-xs" style={{ color: theme.textMuted }}>
              {c.name} {((c.spent / total) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
