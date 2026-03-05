import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChartView } from '@/components/finance/BarChartView';
import { BudgetProgressBar } from '@/components/finance/BudgetProgressBar';
import { CategoryBudgetModal } from '@/components/finance/CategoryBudgetModal';
import { ExpenseForm } from '@/components/finance/ExpenseForm';
import { ExpenseItem } from '@/components/finance/ExpenseItem';
import type { BudgetPeriod } from '@/models/finance';
import { useFinanceStore } from '@/stores/financeStore';
import { currentMonth, todayString } from '@/utils/date';

export default function FinancesScreen() {
  const {
    categories,
    expenses,
    budgets,
    deleteExpense,
    overallBudgetAmount,
    overallBudgetPeriod,
    setOverallBudget,
  } = useFinanceStore();
  const [showSettings, setShowSettings] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [budgetInput, setBudgetInput] = useState(
    overallBudgetAmount > 0 ? String(overallBudgetAmount) : ''
  );

  const month = currentMonth();
  const today = todayString();
  const year = today.slice(0, 4);

  useEffect(() => {
    setBudgetInput(overallBudgetAmount > 0 ? String(overallBudgetAmount) : '');
  }, [overallBudgetAmount]);

  const periodExpenses = useMemo(() => {
    if (overallBudgetPeriod === 'daily') {
      return expenses.filter((e) => new Date(e.date).toISOString().slice(0, 10) === today);
    }
    if (overallBudgetPeriod === 'annual') {
      return expenses.filter((e) => new Date(e.date).toISOString().slice(0, 4) === year);
    }
    return expenses.filter((e) => new Date(e.date).toISOString().slice(0, 7) === month);
  }, [expenses, overallBudgetPeriod, today, month, year]);

  const periodSpent = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = overallBudgetAmount - periodSpent;

  const periodLabel =
    overallBudgetPeriod === 'daily' ? today : overallBudgetPeriod === 'annual' ? year : month;

  const handleSaveOverallBudget = () => {
    const parsed = parseFloat(budgetInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      return;
    }
    setOverallBudget(parsed, overallBudgetPeriod);
  };

  const handleChangePeriod = (period: BudgetPeriod) => {
    setOverallBudget(overallBudgetAmount, period);
  };

  const monthExpenses = expenses
    .filter((e) => new Date(e.date).toISOString().slice(0, 7) === month)
    .sort((a, b) => b.date - a.date);

  const spentByCategory = (categoryId: string) =>
    monthExpenses.filter((e) => e.categoryId === categoryId).reduce((sum, e) => sum + e.amount, 0);

  const getBudgetLimit = (categoryId: string) =>
    budgets.find((b) => b.categoryId === categoryId && b.month === month)?.monthlyLimit ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-gray-900">Money</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
            <Text className="text-indigo-500 font-medium">Budgets</Text>
          </TouchableOpacity>
        </View>

        <View className="px-4 mt-2">
          <ExpenseForm />
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-700 mb-3">Overall budget</Text>

          <View className="flex-row gap-2 mb-3">
            {(['daily', 'monthly', 'annual'] as BudgetPeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => handleChangePeriod(period)}
                className={`px-4 py-1.5 rounded-full ${overallBudgetPeriod === period ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                <Text
                  className={`text-sm font-medium capitalize ${overallBudgetPeriod === period ? 'text-white' : 'text-gray-600'}`}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row gap-2 mb-3">
            <TextInput
              className="flex-1 border border-gray-200 bg-white rounded-xl px-4 py-3 text-base text-gray-800"
              placeholder="Set budget"
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              onPress={handleSaveOverallBudget}
              className="bg-indigo-500 px-4 rounded-xl items-center justify-center">
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-gray-50 rounded-2xl p-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {overallBudgetPeriod} budget ({periodLabel})
            </Text>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-500">Budget</Text>
              <Text className="text-sm font-semibold text-gray-700">
                ${overallBudgetAmount.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-gray-500">Spent</Text>
              <Text className="text-sm font-semibold text-gray-700">${periodSpent.toFixed(2)}</Text>
            </View>
            <View className="h-px bg-gray-200 my-2" />
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-600">Remaining</Text>
              <Text
                className={`text-base font-bold ${remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                ${remainingBudget.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-700 mb-3">Budget overview</Text>
          {categories.map((cat) => (
            <BudgetProgressBar
              key={cat.id}
              category={cat}
              spent={spentByCategory(cat.id)}
              limit={getBudgetLimit(cat.id)}
            />
          ))}
        </View>

        <View className="px-4 mt-6">
          <View className="flex-row gap-2 mb-3">
            {(['bar', 'pie'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setChartType(t)}
                className={`px-4 py-1.5 rounded-full ${chartType === t ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                <Text
                  className={`text-sm font-medium capitalize ${chartType === t ? 'text-white' : 'text-gray-600'}`}>
                  {t} chart
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <BarChartView
            categories={categories}
            spentByCategory={spentByCategory}
            type={chartType}
          />
        </View>

        <View className="px-4 mt-6 mb-8">
          <Text className="text-base font-semibold text-gray-700 mb-2">
            Recent expenses ({month})
          </Text>
          {monthExpenses.length === 0 ? (
            <Text className="text-gray-400 text-sm py-4 text-center">No expenses this month</Text>
          ) : (
            monthExpenses.map((expense) => {
              const cat = categories.find((c) => c.id === expense.categoryId);
              return (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  category={cat}
                  onDelete={() => deleteExpense(expense.id)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <CategoryBudgetModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </SafeAreaView>
  );
}
