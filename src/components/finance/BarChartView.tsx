import { Dimensions, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import type { Category } from '@/models/finance';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  categories: Category[];
  spentByCategory: (id: string) => number;
  type: 'bar' | 'pie';
}

export function BarChartView({ categories, spentByCategory, type }: Props) {
  const chartWidth = SCREEN_WIDTH - 32;

  const categoriesWithSpending = categories.filter((c) => spentByCategory(c.id) > 0);

  if (categoriesWithSpending.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-gray-400 text-sm">No spending data this month</Text>
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
      <View className="bg-gray-50 rounded-2xl p-4">
        <BarChart
          data={barData}
          width={chartWidth - 32}
          barWidth={36}
          spacing={12}
          roundedTop
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10 }}
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
    <View className="bg-gray-50 rounded-2xl p-4 items-center">
      <PieChart
        data={pieData}
        donut
        radius={90}
        innerRadius={55}
        centerLabelComponent={() => (
          <View className="items-center">
            <Text className="text-xs text-gray-400">Total</Text>
            <Text className="text-base font-bold text-gray-800">${total.toFixed(0)}</Text>
          </View>
        )}
      />
      <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4">
        {categoriesWithSpending.map((c) => (
          <View key={c.id} className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <Text className="text-xs text-gray-600">
              {c.name} {((spentByCategory(c.id) / total) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
