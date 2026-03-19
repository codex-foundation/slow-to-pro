import { useFinanceStore } from '../../stores/financeStore';
import { scheduleOverBudgetNotification } from '../../utils/notifications';
import { currentMonth } from '../../utils/date';

jest.mock('../../utils/notifications', () => ({
  scheduleOverBudgetNotification: jest.fn(),
  scheduleTimerEndNotification: jest.fn(),
}));

const DEFAULT_CATEGORY_NAMES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other'];
const FOOD_ID = 'cat-food';

function resetStore() {
  useFinanceStore.setState({
    categories: [
      { id: 'cat-food', name: 'Food', color: '#f97316' },
      { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
      { id: 'cat-housing', name: 'Housing', color: '#8b5cf6' },
      { id: 'cat-entertainment', name: 'Entertainment', color: '#ec4899' },
      { id: 'cat-health', name: 'Health', color: '#22c55e' },
      { id: 'cat-other', name: 'Other', color: '#94a3b8' },
    ],
    budgets: [],
    expenses: [],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly',
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('financeStore', () => {
  describe('initial state', () => {
    it('seeds the default categories', () => {
      const { categories } = useFinanceStore.getState();
      const names = categories.map((c) => c.name);
      expect(names).toEqual(DEFAULT_CATEGORY_NAMES);
    });

    it('starts with a monthly overall budget set to zero', () => {
      const { overallBudgetAmount, overallBudgetPeriod } = useFinanceStore.getState();
      expect(overallBudgetAmount).toBe(0);
      expect(overallBudgetPeriod).toBe('monthly');
    });
  });

  describe('setOverallBudget', () => {
    it('updates overall budget amount and period', () => {
      useFinanceStore.getState().setOverallBudget(1200, 'monthly');

      const { overallBudgetAmount, overallBudgetPeriod } = useFinanceStore.getState();
      expect(overallBudgetAmount).toBe(1200);
      expect(overallBudgetPeriod).toBe('monthly');
    });

    it('supports daily and annual periods', () => {
      useFinanceStore.getState().setOverallBudget(40, 'daily');
      expect(useFinanceStore.getState().overallBudgetPeriod).toBe('daily');

      useFinanceStore.getState().setOverallBudget(20000, 'annual');
      expect(useFinanceStore.getState().overallBudgetPeriod).toBe('annual');
    });
  });

  describe('getTotalSpentForPeriod', () => {
    it('returns total for a specific day', () => {
      useFinanceStore.setState({
        expenses: [
          {
            id: 'e1',
            categoryId: FOOD_ID,
            amount: 10,
            date: Date.parse('2026-03-04T08:00:00.000Z'),
          },
          {
            id: 'e2',
            categoryId: FOOD_ID,
            amount: 15,
            date: Date.parse('2026-03-04T10:00:00.000Z'),
          },
          {
            id: 'e3',
            categoryId: FOOD_ID,
            amount: 20,
            date: Date.parse('2026-03-05T10:00:00.000Z'),
          },
        ],
      });

      const total = useFinanceStore
        .getState()
        .getTotalSpentForPeriod('daily', Date.parse('2026-03-04T12:00:00.000Z'));
      expect(total).toBe(25);
    });

    it('returns total for a specific month', () => {
      useFinanceStore.setState({
        expenses: [
          {
            id: 'e1',
            categoryId: FOOD_ID,
            amount: 10,
            date: Date.parse('2026-03-01T08:00:00.000Z'),
          },
          {
            id: 'e2',
            categoryId: FOOD_ID,
            amount: 15,
            date: Date.parse('2026-03-20T10:00:00.000Z'),
          },
          {
            id: 'e3',
            categoryId: FOOD_ID,
            amount: 20,
            date: Date.parse('2026-04-01T10:00:00.000Z'),
          },
        ],
      });

      const total = useFinanceStore
        .getState()
        .getTotalSpentForPeriod('monthly', Date.parse('2026-03-10T12:00:00.000Z'));
      expect(total).toBe(25);
    });

    it('returns total for a specific year', () => {
      useFinanceStore.setState({
        expenses: [
          {
            id: 'e1',
            categoryId: FOOD_ID,
            amount: 100,
            date: Date.parse('2026-01-10T08:00:00.000Z'),
          },
          {
            id: 'e2',
            categoryId: FOOD_ID,
            amount: 200,
            date: Date.parse('2026-11-20T10:00:00.000Z'),
          },
          {
            id: 'e3',
            categoryId: FOOD_ID,
            amount: 300,
            date: Date.parse('2025-11-20T10:00:00.000Z'),
          },
        ],
      });

      const total = useFinanceStore
        .getState()
        .getTotalSpentForPeriod('annual', Date.parse('2026-06-10T12:00:00.000Z'));
      expect(total).toBe(300);
    });
  });

  describe('addCategory', () => {
    it('appends a new category', () => {
      useFinanceStore.getState().addCategory('Pets', '#ff0000');
      const { categories } = useFinanceStore.getState();
      expect(categories.at(-1)?.name).toBe('Pets');
      expect(categories.at(-1)?.color).toBe('#ff0000');
    });

    it('returns created category id', () => {
      const id = useFinanceStore.getState().addCategory('Subscriptions', '#123456');
      expect(typeof id).toBe('string');
      expect(useFinanceStore.getState().categories.some((c) => c.id === id)).toBe(true);
    });

    it('generates a unique id', () => {
      useFinanceStore.getState().addCategory('A', '#000');
      useFinanceStore.getState().addCategory('B', '#000');
      const ids = useFinanceStore.getState().categories.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('deleteCategory', () => {
    it('removes the category', () => {
      useFinanceStore.getState().deleteCategory(FOOD_ID);
      const names = useFinanceStore.getState().categories.map((c) => c.name);
      expect(names).not.toContain('Food');
    });

    it('removes associated expenses', () => {
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 10 });
      useFinanceStore.getState().deleteCategory(FOOD_ID);
      expect(useFinanceStore.getState().expenses).toHaveLength(0);
    });

    it('removes associated budgets', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 200, currentMonth());
      useFinanceStore.getState().deleteCategory(FOOD_ID);
      expect(useFinanceStore.getState().budgets).toHaveLength(0);
    });
  });

  describe('upsertBudget', () => {
    it('creates a new budget for a category', () => {
      const month = currentMonth();
      useFinanceStore.getState().upsertBudget(FOOD_ID, 200, month);
      const { budgets } = useFinanceStore.getState();
      expect(budgets).toHaveLength(1);
      expect(budgets[0].monthlyLimit).toBe(200);
      expect(budgets[0].month).toBe(month);
    });

    it('updates an existing budget for the same category and month', () => {
      const month = currentMonth();
      useFinanceStore.getState().upsertBudget(FOOD_ID, 200, month);
      useFinanceStore.getState().upsertBudget(FOOD_ID, 350, month);
      const { budgets } = useFinanceStore.getState();
      expect(budgets).toHaveLength(1);
      expect(budgets[0].monthlyLimit).toBe(350);
    });

    it('creates separate budgets for different months', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 200, '2026-01');
      useFinanceStore.getState().upsertBudget(FOOD_ID, 250, '2026-02');
      expect(useFinanceStore.getState().budgets).toHaveLength(2);
    });
  });

  describe('addExpense', () => {
    it('records the expense with correct fields', () => {
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 42.5, note: 'lunch' });
      const { expenses } = useFinanceStore.getState();
      expect(expenses).toHaveLength(1);
      expect(expenses[0].categoryId).toBe(FOOD_ID);
      expect(expenses[0].amount).toBe(42.5);
      expect(expenses[0].note).toBe('lunch');
    });

    it('sets date to approximately now', () => {
      const before = Date.now();
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 10 });
      const after = Date.now();
      const { date } = useFinanceStore.getState().expenses[0];
      expect(date).toBeGreaterThanOrEqual(before);
      expect(date).toBeLessThanOrEqual(after);
    });

    it('does not fire a notification when no budget is set', () => {
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 999 });
      expect(scheduleOverBudgetNotification).not.toHaveBeenCalled();
    });

    it('does not fire a notification when under budget', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 100, currentMonth());
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 50 });
      expect(scheduleOverBudgetNotification).not.toHaveBeenCalled();
    });

    it('fires a notification when cumulative spending exceeds budget', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 100, currentMonth());
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 60 });
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 50 }); // total = 110 → over

      expect(scheduleOverBudgetNotification).toHaveBeenCalledWith('Food', 110, 100);
    });

    it('does not fire duplicate notifications within the same threshold band', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 100, currentMonth());

      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 110 }); // 110%
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 5 }); // 115%

      expect(scheduleOverBudgetNotification).toHaveBeenCalledTimes(1);
      expect(scheduleOverBudgetNotification).toHaveBeenCalledWith('Food', 110, 100);
    });

    it('fires again when crossing a higher threshold', () => {
      useFinanceStore.getState().upsertBudget(FOOD_ID, 100, currentMonth());

      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 110 }); // 110%
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 45 }); // 155%

      expect(scheduleOverBudgetNotification).toHaveBeenCalledTimes(2);
      expect(scheduleOverBudgetNotification).toHaveBeenNthCalledWith(1, 'Food', 110, 100);
      expect(scheduleOverBudgetNotification).toHaveBeenNthCalledWith(2, 'Food', 155, 100);
    });
  });

  describe('deleteExpense', () => {
    it('removes the expense by id', () => {
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 10 });
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 20 });
      const id = useFinanceStore.getState().expenses[0].id;

      useFinanceStore.getState().deleteExpense(id);

      const { expenses } = useFinanceStore.getState();
      expect(expenses).toHaveLength(1);
      expect(expenses[0].amount).toBe(20);
    });
  });

  describe('updateCategory', () => {
    it('updates the name and color of an existing category', () => {
      useFinanceStore.getState().updateCategory(FOOD_ID, 'Groceries', '#00ff00');
      const { categories } = useFinanceStore.getState();
      const cat = categories.find((c) => c.id === FOOD_ID);
      expect(cat?.name).toBe('Groceries');
      expect(cat?.color).toBe('#00ff00');
    });

    it('leaves other categories unchanged', () => {
      const before = useFinanceStore.getState().categories.filter((c) => c.id !== FOOD_ID);
      useFinanceStore.getState().updateCategory(FOOD_ID, 'Groceries', '#00ff00');
      const after = useFinanceStore.getState().categories.filter((c) => c.id !== FOOD_ID);
      expect(after).toEqual(before);
    });
  });

  describe('deleteCategory - notifiedBudgetThresholdByKey cleanup', () => {
    it('removes threshold keys matching the deleted category', () => {
      useFinanceStore.setState((s) => ({
        ...s,
        notifiedBudgetThresholdByKey: {
          [`${FOOD_ID}:2026-04`]: 80,
          'other-cat:2026-04': 80,
        },
      }));

      useFinanceStore.getState().deleteCategory(FOOD_ID);

      const { notifiedBudgetThresholdByKey } = useFinanceStore.getState();
      expect(Object.keys(notifiedBudgetThresholdByKey)).not.toContain(`${FOOD_ID}:2026-04`);
      expect(Object.keys(notifiedBudgetThresholdByKey)).toContain('other-cat:2026-04');
    });
  });

  describe('upsertBudget - update path', () => {
    it('preserves other budgets when updating one', () => {
      const month = currentMonth();
      useFinanceStore.getState().upsertBudget(FOOD_ID, 100, month);
      useFinanceStore.getState().upsertBudget('other-id', 200, month);
      // Update FOOD_ID budget
      useFinanceStore.getState().upsertBudget(FOOD_ID, 150, month);
      const budgets = useFinanceStore.getState().budgets;
      const foodBudget = budgets.find((b) => b.categoryId === FOOD_ID);
      const otherBudget = budgets.find((b) => b.categoryId === 'other-id');
      expect(foodBudget?.monthlyLimit).toBe(150);
      expect(otherBudget?.monthlyLimit).toBe(200);
    });
  });

  describe('getTotalSpentForPeriod - default referenceDate', () => {
    it('uses current date when referenceDate is not provided', () => {
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 50 });
      const total = useFinanceStore.getState().getTotalSpentForPeriod('monthly');
      expect(total).toBe(50);
    });
  });

  describe('addExpense - category not found', () => {
    it('does not fire notification when category is not found', () => {
      const { scheduleOverBudgetNotification } = jest.requireMock('@/utils/notifications');
      jest.clearAllMocks();
      // Add a budget for the category, but category is not in store
      useFinanceStore.setState((s) => ({
        ...s,
        categories: [],
        budgets: [{ id: 'b1', categoryId: FOOD_ID, monthlyLimit: 10, month: currentMonth() }],
      }));
      useFinanceStore.getState().addExpense({ categoryId: FOOD_ID, amount: 50 });
      // cat is undefined → if (cat) is false → no notification
      expect(scheduleOverBudgetNotification).not.toHaveBeenCalled();
    });
  });
});
