import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { BarChartView } from '@/components/finance/BarChartView';
import { BudgetProgressBar } from '@/components/finance/BudgetProgressBar';
import { CategoryBudgetModal } from '@/components/finance/CategoryBudgetModal';
import { ExpenseForm } from '@/components/finance/ExpenseForm';
import { ExpenseItem } from '@/components/finance/ExpenseItem';
import { Modal } from '@/components/ui/Modal';
import type { BudgetPeriod } from '@/models/finance';
import { useFinanceStore } from '@/stores/financeStore';
import { currentMonth, todayString } from '@/utils/date';

export default function FinancesScreen() {
  const theme = useAppTheme();
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
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);
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
    setShowSetBudget(false);
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Money
          </Text>
          <TouchableOpacity onPress={() => setShowSettings(true)} className="p-1">
            <Text className="font-medium" style={{ color: theme.primary }}>
              Budgets
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          entering={FadeInUp.delay(40).duration(260)}
          layout={Layout.springify()}
          className="px-4 mt-2">
          <TouchableOpacity
            onPress={() => setShowAddExpense(true)}
            className="rounded-2xl px-4 py-4 flex-row items-center justify-between"
            style={{ backgroundColor: theme.primary }}>
            <View>
              <Text className="text-white text-base font-semibold">Add expense</Text>
              <Text
                className="text-xs mt-0.5"
                style={{ color: theme.isDark ? '#c7d2fe' : '#e0e7ff' }}>
                Track a new transaction
              </Text>
            </View>
            <Text className="text-white text-2xl leading-none">＋</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(80).duration(260)}
          layout={Layout.springify()}
          className="px-4 mt-6">
          <Text className="text-base font-semibold mb-3" style={{ color: theme.textMuted }}>
            Overall budget
          </Text>

          <TouchableOpacity
            onPress={() => setShowSetBudget(true)}
            className="mb-3 border rounded-2xl px-4 py-3 flex-row items-center justify-between"
            style={{ backgroundColor: theme.primarySoft, borderColor: theme.border }}>
            <View>
              <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
                Set overall budget
              </Text>
              <Text className="text-xs mt-0.5 capitalize" style={{ color: theme.textSubtle }}>
                {overallBudgetPeriod} period
              </Text>
            </View>
            <Text className="text-lg" style={{ color: theme.primary }}>
              ✎
            </Text>
          </TouchableOpacity>

          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.border,
              borderWidth: 1,
            }}>
            <Text
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: theme.textSubtle }}>
              {overallBudgetPeriod} budget ({periodLabel})
            </Text>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm" style={{ color: theme.textSubtle }}>
                Budget
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.textMuted }}>
                ${overallBudgetAmount.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm" style={{ color: theme.textSubtle }}>
                Spent
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.textMuted }}>
                ${periodSpent.toFixed(2)}
              </Text>
            </View>
            <View className="h-px my-2" style={{ backgroundColor: theme.border }} />
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
                Remaining
              </Text>
              <Text
                className="text-base font-bold"
                style={{ color: remainingBudget >= 0 ? theme.success : theme.danger }}>
                ${remainingBudget.toFixed(2)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(120).duration(260)}
          layout={Layout.springify()}
          className="px-4 mt-6">
          <Text className="text-base font-semibold mb-3" style={{ color: theme.textMuted }}>
            Budget overview
          </Text>
          {categories.map((cat) => (
            <BudgetProgressBar
              key={cat.id}
              category={cat}
              spent={spentByCategory(cat.id)}
              limit={getBudgetLimit(cat.id)}
            />
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(160).duration(260)}
          layout={Layout.springify()}
          className="px-4 mt-6">
          <View className="flex-row gap-2 mb-3">
            {(['bar', 'pie'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setChartType(t)}
                className="px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: chartType === t ? theme.primary : theme.surface,
                  borderColor: theme.border,
                  borderWidth: chartType === t ? 0 : 1,
                }}>
                <Text
                  className="text-sm font-medium capitalize"
                  style={{ color: chartType === t ? '#fff' : theme.textMuted }}>
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
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(260)}
          layout={Layout.springify()}
          className="px-4 mt-6 mb-8">
          <Text className="text-base font-semibold mb-2" style={{ color: theme.textMuted }}>
            Recent expenses ({month})
          </Text>
          {monthExpenses.length === 0 ? (
            <Text className="text-sm py-4 text-center" style={{ color: theme.textSubtle }}>
              No expenses this month
            </Text>
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
        </Animated.View>
      </ScrollView>

      <CategoryBudgetModal visible={showSettings} onClose={() => setShowSettings(false)} />

      <Modal visible={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add expense">
        <ExpenseForm onSubmitted={() => setShowAddExpense(false)} />
      </Modal>

      <Modal visible={showSetBudget} onClose={() => setShowSetBudget(false)} title="Set budget">
        <View className="gap-3">
          <View className="flex-row gap-2">
            {(['daily', 'monthly', 'annual'] as BudgetPeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => handleChangePeriod(period)}
                className="px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: overallBudgetPeriod === period ? theme.primary : theme.surface,
                  borderColor: theme.border,
                  borderWidth: overallBudgetPeriod === period ? 0 : 1,
                }}>
                <Text
                  className="text-sm font-medium capitalize"
                  style={{ color: overallBudgetPeriod === period ? '#fff' : theme.textMuted }}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-xl px-4 py-3 text-base"
              style={{
                borderColor: theme.border,
                borderWidth: 1,
                backgroundColor: theme.surface,
                color: theme.text,
              }}
              placeholder="Set budget"
              placeholderTextColor={theme.textSubtle}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              onPress={handleSaveOverallBudget}
              className="px-4 rounded-xl items-center justify-center"
              style={{ backgroundColor: theme.primary }}>
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
