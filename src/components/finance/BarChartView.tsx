import { Dimensions, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Category } from '@/models/finance';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  categories: Category[];
  spentByCategory: (id: string) => number;
  type: 'bar' | 'pie';
}

export function BarChartView({ categories, spentByCategory, type }: Props) {
  const theme = useAppTheme();
  const chartWidth = SCREEN_WIDTH - 32;

  const categoriesWithSpending = categories.filter((c) => spentByCategory(c.id) > 0);

  if (categoriesWithSpending.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-sm" style={{ color: theme.textSubtle }}>
          No spending data this month
        </Text>
      </View>
    );
  }

  if (type === 'bar') {
    const barData = categories
      .filter((c) => spentByCategory(c.id) > 0)
      .map((c) => ({
        value: spentByCategory(c.id),
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
          data={barData}
          width={chartWidth - 32}
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

  const pieData = categoriesWithSpending.map((c) => ({
    value: spentByCategory(c.id),
    color: c.color,
    text: c.name.slice(0, 4),
  }));

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <View
      className="rounded-2xl p-4 items-center"
      style={{
        backgroundColor: theme.surfaceMuted,
        borderColor: theme.border,
        borderWidth: 1,
      }}>
      <PieChart
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
        {categoriesWithSpending.map((c) => (
          <View key={c.id} className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <Text className="text-xs" style={{ color: theme.textMuted }}>
              {c.name} {((spentByCategory(c.id) / total) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
