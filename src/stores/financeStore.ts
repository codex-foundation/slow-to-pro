import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Budget, BudgetPeriod, Category, Expense } from '@/models/finance';
import { currentMonth } from '@/utils/date';
import { generateId } from '@/utils/id';
import { mmkvStorage } from '@/utils/mmkv';
import { scheduleOverBudgetNotification } from '@/utils/notifications';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food', color: '#f97316' },
  { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
  { id: 'cat-housing', name: 'Housing', color: '#8b5cf6' },
  { id: 'cat-entertainment', name: 'Entertainment', color: '#ec4899' },
  { id: 'cat-health', name: 'Health', color: '#22c55e' },
  { id: 'cat-other', name: 'Other', color: '#94a3b8' },
];

const OVER_BUDGET_NOTIFICATION_THRESHOLDS = [1, 1.2, 1.5] as const;

function periodKey(ms: number, period: BudgetPeriod): string {
  const iso = new Date(ms).toISOString();
  if (period === 'daily') return iso.slice(0, 10);
  if (period === 'monthly') return iso.slice(0, 7);
  return iso.slice(0, 4);
}

interface FinanceStore {
  categories: Category[];
  budgets: Budget[];
  expenses: Expense[];
  notifiedBudgetThresholdByKey: Record<string, number>;
  overallBudgetAmount: number;
  overallBudgetPeriod: BudgetPeriod;
  addCategory: (name: string, color: string) => string;
  updateCategory: (id: string, name: string, color: string) => void;
  deleteCategory: (id: string) => void;
  upsertBudget: (categoryId: string, limit: number, month: string) => void;
  setOverallBudget: (amount: number, period: BudgetPeriod) => void;
  getTotalSpentForPeriod: (period: BudgetPeriod, referenceDate?: number) => number;
  addExpense: (data: Pick<Expense, 'categoryId' | 'amount' | 'note'>) => void;
  deleteExpense: (id: string) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      budgets: [],
      expenses: [],
      notifiedBudgetThresholdByKey: {},
      overallBudgetAmount: 0,
      overallBudgetPeriod: 'monthly',

      addCategory: (name, color) => {
        const cat: Category = { id: generateId(), name, color };
        set((s) => ({ categories: [...s.categories, cat] }));
        return cat.id;
      },

      updateCategory: (id, name, color) => {
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, name, color } : c)),
        }));
      },

      deleteCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          budgets: s.budgets.filter((b) => b.categoryId !== id),
          expenses: s.expenses.filter((e) => e.categoryId !== id),
          notifiedBudgetThresholdByKey: Object.fromEntries(
            Object.entries(s.notifiedBudgetThresholdByKey).filter(
              ([key]) => !key.startsWith(`${id}:`)
            )
          ),
        }));
      },

      upsertBudget: (categoryId, limit, month) => {
        const notifyKey = `${categoryId}:${month}`;
        set((s) => {
          const existing = s.budgets.find((b) => b.categoryId === categoryId && b.month === month);
          const { [notifyKey]: _removed, ...remainingThresholds } = s.notifiedBudgetThresholdByKey;
          if (existing) {
            return {
              budgets: s.budgets.map((b) =>
                b.id === existing.id ? { ...b, monthlyLimit: limit } : b
              ),
              notifiedBudgetThresholdByKey: remainingThresholds,
            };
          }
          return {
            budgets: [...s.budgets, { id: generateId(), categoryId, monthlyLimit: limit, month }],
            notifiedBudgetThresholdByKey: remainingThresholds,
          };
        });
      },

      setOverallBudget: (amount, period) => {
        set({ overallBudgetAmount: amount, overallBudgetPeriod: period });
      },

      getTotalSpentForPeriod: (period, referenceDate = Date.now()) => {
        const key = periodKey(referenceDate, period);
        return get()
          .expenses.filter((e) => periodKey(e.date, period) === key)
          .reduce((sum, e) => sum + e.amount, 0);
      },

      addExpense: ({ categoryId, amount, note }) => {
        const expense: Expense = {
          id: generateId(),
          categoryId,
          amount,
          note,
          date: Date.now(),
        };
        set((s) => ({ expenses: [...s.expenses, expense] }));

        // Check over-budget
        const { expenses, budgets, categories, notifiedBudgetThresholdByKey } = get();
        const month = currentMonth();
        const total = expenses
          .filter(
            (e) =>
              e.categoryId === categoryId && new Date(e.date).toISOString().slice(0, 7) === month
          )
          .reduce((sum, e) => sum + e.amount, 0);
        const budget = budgets.find((b) => b.categoryId === categoryId && b.month === month);
        if (budget && budget.monthlyLimit > 0) {
          const ratio = total / budget.monthlyLimit;
          const reachedThreshold = OVER_BUDGET_NOTIFICATION_THRESHOLDS.reduce(
            (highest, threshold) => (ratio >= threshold ? threshold : highest),
            0
          );
          const notifyKey = `${categoryId}:${month}`;
          const lastNotifiedThreshold = notifiedBudgetThresholdByKey[notifyKey] ?? 0;

          if (reachedThreshold > lastNotifiedThreshold) {
            set((s) => ({
              notifiedBudgetThresholdByKey: {
                ...s.notifiedBudgetThresholdByKey,
                [notifyKey]: reachedThreshold,
              },
            }));

            const cat = categories.find((c) => c.id === categoryId);
            if (cat) {
              scheduleOverBudgetNotification(cat.name, total, budget.monthlyLimit);
            }
          }
        }
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      },
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
