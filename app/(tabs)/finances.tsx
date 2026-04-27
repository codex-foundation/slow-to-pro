import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChartView } from '@/components/finance/BarChartView';
import { BudgetProgressBar } from '@/components/finance/BudgetProgressBar';
import { CategoryBudgetModal } from '@/components/finance/CategoryBudgetModal';
import { ExpenseForm } from '@/components/finance/ExpenseForm';
import { ExpenseItem } from '@/components/finance/ExpenseItem';
import { MonthPicker } from '@/components/finance/MonthPicker';
import { Modal } from '@/components/ui/Modal';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { Card, Halo, PillGroup, ScreenHeader, SectionLabel } from '@/design';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { BudgetPeriod } from '@/models/finance';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useFinanceStore } from '@/stores/financeStore';
import { currentMonth, todayString } from '@/utils/date';
import { exportFinancesAsCsv, exportFinancesAsPdf } from '@/utils/financeExport';
import { availableMonths, nextMonth, prevMonth } from '@/utils/historyUtils';

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'daily', label: 'daily' },
  { value: 'monthly', label: 'monthly' },
  { value: 'annual', label: 'annual' },
];

const CHART_OPTIONS = [
  { value: 'bar' as const, label: 'bar chart' },
  { value: 'pie' as const, label: 'pie chart' },
];

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const isPro = useEntitlementStore((s) => s.isPro);
  const [budgetInput, setBudgetInput] = useState(
    overallBudgetAmount > 0 ? String(overallBudgetAmount) : ''
  );

  const month = currentMonth();

  const allMonths = useMemo(() => availableMonths(expenses), [expenses]);
  const historyMonths = useMemo(() => allMonths.filter((m) => m < month), [allMonths, month]);

  const [historyMonth, setHistoryMonth] = useState<string | null>(() => historyMonths[0] ?? null);

  useEffect(() => {
    setHistoryMonth((prev) => {
      if (!prev || !historyMonths.includes(prev)) return historyMonths[0] ?? null;
      return prev;
    });
  }, [historyMonths]);

  const historyExpenses = useMemo(
    () =>
      historyMonth
        ? expenses
            .filter((e) => new Date(e.date).toISOString().slice(0, 7) === historyMonth)
            .sort((a, b) => b.date - a.date)
        : [],
    [expenses, historyMonth]
  );

  const historySpentByCategory = (categoryId: string) =>
    historyExpenses
      .filter((e) => e.categoryId === categoryId)
      .reduce((sum, e) => sum + e.amount, 0);

  const historyGetBudgetLimit = (categoryId: string) =>
    budgets.find((b) => b.categoryId === categoryId && b.month === historyMonth)?.monthlyLimit ?? 0;

  const handleHistoryPrev = () => {
    if (historyMonth) setHistoryMonth(prevMonth(historyMonth));
  };

  const handleHistoryNext = () => {
    if (!historyMonth || historyMonth === historyMonths[0]) return;
    setHistoryMonth(nextMonth(historyMonth));
  };

  const isHistoryNextDisabled = !historyMonth || historyMonth === historyMonths[0];

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
  const spentPercentage =
    overallBudgetAmount > 0 ? Math.max(0, (periodSpent / overallBudgetAmount) * 100) : null;

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

  const handleExport = () => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    if (Platform.OS === 'web') {
      void exportFinancesAsCsv(expenses, categories, budgets);
      return;
    }
    Alert.alert('Export Finance Data', 'Choose format', [
      {
        text: 'CSV',
        onPress: () => {
          setExporting(true);
          void exportFinancesAsCsv(expenses, categories, budgets).finally(() =>
            setExporting(false)
          );
        },
      },
      {
        text: 'PDF',
        onPress: () => {
          setExporting(true);
          void exportFinancesAsPdf(expenses, categories, budgets).finally(() =>
            setExporting(false)
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const subtitle = `${periodLabel} · ${overallBudgetAmount > 0 ? 'spent so far' : 'tracking expenses'}`;

  const pillBtn = (active: boolean) => ({
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: active ? theme.primary : theme.surface,
    borderColor: active ? theme.primary : theme.border,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <Halo size={380} top={-140} right={-80} opacity={theme.isDark ? 0.14 : 0.1} />
      <ScrollView
        testID="finances-scroll-view"
        showsVerticalScrollIndicator={false}
        scrollEnabled
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader
          eyebrow="Money"
          title="Finances"
          subtitle={subtitle}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={handleExport}
                disabled={exporting}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: exporting ? theme.textSubtle : theme.text,
                  }}>
                  {exporting ? 'Exporting…' : 'Export'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>Budgets</Text>
              </TouchableOpacity>
            </View>
          }
        />

        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 56,
              fontWeight: '700',
              letterSpacing: -2,
              color: theme.text,
              fontVariant: ['tabular-nums'],
              lineHeight: 64,
            }}>
            ${periodSpent.toFixed(2)}
          </Text>
          {overallBudgetAmount > 0 && spentPercentage !== null && (
            <Text
              style={{
                marginTop: 4,
                fontSize: 13,
                fontWeight: '600',
                color: remainingBudget >= 0 ? theme.success : theme.danger,
              }}>
              {remainingBudget >= 0
                ? `${(100 - spentPercentage).toFixed(0)}% of budget remaining`
                : `Over budget by $${(-remainingBudget).toFixed(2)}`}
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Animated.View entering={FadeInUp.delay(40).duration(260)} layout={Layout.springify()}>
            <TouchableOpacity
              onPress={() => setShowAddExpense(true)}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 20,
                paddingHorizontal: 18,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Add expense</Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: theme.isDark ? '#c7d2fe' : '#e0e7ff',
                  }}>
                  Track a new transaction
                </Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 26, lineHeight: 26 }}>＋</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <SectionLabel>Overall budget</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={FadeInUp.delay(80).duration(260)} layout={Layout.springify()}>
            <TouchableOpacity
              onPress={() => setShowSetBudget(true)}
              style={{
                marginBottom: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.primarySoft,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary }}>
                  Set overall budget
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: theme.textSubtle,
                    textTransform: 'capitalize',
                  }}>
                  {overallBudgetPeriod} period
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: theme.primary }}>✎</Text>
            </TouchableOpacity>

            <Card>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: theme.textSubtle,
                  marginBottom: 10,
                }}>
                {overallBudgetPeriod} budget ({periodLabel})
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                <Text style={{ fontSize: 13, color: theme.textSubtle }}>Budget</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textMuted }}>
                  ${overallBudgetAmount.toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                <Text style={{ fontSize: 13, color: theme.textSubtle }}>Spent</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textMuted }}>
                    ${periodSpent.toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSubtle }}>
                    {spentPercentage === null
                      ? 'No budget set'
                      : `${spentPercentage.toFixed(0)}% used`}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, marginVertical: 10, backgroundColor: theme.border }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textMuted }}>
                  Remaining
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: remainingBudget >= 0 ? theme.success : theme.danger,
                  }}>
                  ${remainingBudget.toFixed(2)}
                </Text>
              </View>
            </Card>
          </Animated.View>
        </View>

        <SectionLabel>Budget overview</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={FadeInUp.delay(120).duration(260)} layout={Layout.springify()}>
            <Card>
              {categories.map((cat) => (
                <BudgetProgressBar
                  key={cat.id}
                  category={cat}
                  spent={spentByCategory(cat.id)}
                  limit={getBudgetLimit(cat.id)}
                />
              ))}
            </Card>
          </Animated.View>
        </View>

        <SectionLabel>Breakdown</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={FadeInUp.delay(160).duration(260)} layout={Layout.springify()}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {CHART_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setChartType(opt.value)}
                  style={pillBtn(chartType === opt.value)}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: chartType === opt.value ? '#fff' : theme.textMuted,
                    }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card>
              <BarChartView
                categories={categories}
                spentByCategory={spentByCategory}
                type={chartType}
              />
            </Card>
          </Animated.View>
        </View>

        <SectionLabel>Recent expenses ({month})</SectionLabel>
        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={FadeInUp.delay(200).duration(260)} layout={Layout.springify()}>
            <Card>
              {monthExpenses.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    paddingVertical: 12,
                    textAlign: 'center',
                    color: theme.textSubtle,
                  }}>
                  No expenses recorded yet
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
            </Card>
          </Animated.View>
        </View>

        {historyMonths.length > 0 && (
          <>
            <SectionLabel>History</SectionLabel>
            <View style={{ paddingHorizontal: 20 }}>
              <Animated.View
                entering={FadeInUp.delay(240).duration(260)}
                layout={Layout.springify()}>
                <Card padded={false}>
                  <MonthPicker
                    month={historyMonth!}
                    onPrev={handleHistoryPrev}
                    onNext={handleHistoryNext}
                    disableNext={isHistoryNextDisabled}
                  />
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                  <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                    {categories.map((cat) => (
                      <BudgetProgressBar
                        key={cat.id}
                        category={cat}
                        spent={historySpentByCategory(cat.id)}
                        limit={historyGetBudgetLimit(cat.id)}
                      />
                    ))}
                    <View style={{ height: 1, marginVertical: 8, backgroundColor: theme.border }} />
                    {historyExpenses.length === 0 ? (
                      <Text
                        style={{
                          fontSize: 13,
                          paddingVertical: 8,
                          textAlign: 'center',
                          color: theme.textSubtle,
                        }}>
                        No expenses this month
                      </Text>
                    ) : (
                      historyExpenses.map((expense) => {
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
                </Card>
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>

      <CategoryBudgetModal visible={showSettings} onClose={() => setShowSettings(false)} />

      <Modal visible={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add expense">
        <ExpenseForm
          onSubmitted={() => setShowAddExpense(false)}
          onOpenCategoryModal={() => {
            setShowAddExpense(false);
            setShowSettings(true);
          }}
        />
      </Modal>

      <Modal visible={showSetBudget} onClose={() => setShowSetBudget(false)} title="Set budget">
        <View style={{ gap: 12 }}>
          <PillGroup
            options={PERIOD_OPTIONS}
            value={overallBudgetPeriod}
            onChange={handleChangePeriod}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
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
              style={{
                paddingHorizontal: 18,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
              }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgraded={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}
