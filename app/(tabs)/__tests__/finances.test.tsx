import { fireEvent, render, waitFor } from '@testing-library/react-native';

import FinancesScreen from '../finances';
import { useFinanceStore } from '@/stores/financeStore';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock') as {
    default: { call: () => void };
  };
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@/components/ui/Modal', () => {
  return {
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? children : null,
  };
});

jest.mock('@/components/finance/BarChartView', () => ({
  BarChartView: () => null,
}));

jest.mock('@/components/finance/BudgetProgressBar', () => ({
  BudgetProgressBar: () => null,
}));

jest.mock('@/components/finance/CategoryBudgetModal', () => ({
  CategoryBudgetModal: () => null,
}));

jest.mock('@/components/finance/ExpenseItem', () => ({
  ExpenseItem: () => null,
}));

jest.mock('@/components/finance/ExpenseForm', () => {
  const mockRN = jest.requireActual('react-native') as {
    Pressable: React.ComponentType<{
      onPress?: () => void;
      testID?: string;
      children?: React.ReactNode;
    }>;
    Text: React.ComponentType<{ children?: React.ReactNode }>;
  };
  const mockReact = jest.requireActual('react') as typeof import('react');

  return {
    ExpenseForm: ({ onSubmitted }: { onSubmitted?: () => void }) =>
      mockReact.createElement(
        mockRN.Pressable,
        {
          onPress: () => onSubmitted?.(),
          testID: 'mock-expense-submit',
        },
        mockReact.createElement(mockRN.Text, null, 'Submit mock expense')
      ),
  };
});

function resetFinanceStore() {
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

describe('FinancesScreen modal behavior', () => {
  beforeEach(() => {
    resetFinanceStore();
  });

  it('shows spent percentage based on overall budget', () => {
    useFinanceStore.setState((state) => ({
      ...state,
      overallBudgetAmount: 200,
      overallBudgetPeriod: 'monthly',
      expenses: [
        {
          id: 'expense-1',
          categoryId: 'cat-food',
          amount: 50,
          date: Date.now(),
        },
      ],
    }));

    const { getByText } = render(<FinancesScreen />);

    expect(getByText('25% used')).toBeTruthy();
  });

  it('opens add expense modal and closes it after successful submit', async () => {
    const { getByText, getByTestId, queryByTestId } = render(<FinancesScreen />);

    expect(queryByTestId('mock-expense-submit')).toBeNull();

    fireEvent.press(getByText('Add expense'));
    expect(getByTestId('mock-expense-submit')).toBeTruthy();

    fireEvent.press(getByTestId('mock-expense-submit'));

    await waitFor(() => {
      expect(queryByTestId('mock-expense-submit')).toBeNull();
    });
  });

  it('opens set budget modal, saves budget, and closes modal', async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<FinancesScreen />);

    fireEvent.press(getByText('Set overall budget'));
    expect(getByPlaceholderText('Set budget')).toBeTruthy();

    fireEvent.press(getByText('annual'));
    fireEvent.changeText(getByPlaceholderText('Set budget'), '1500');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(queryByText('Set budget')).toBeNull();
    });

    const { overallBudgetAmount, overallBudgetPeriod } = useFinanceStore.getState();
    expect(overallBudgetAmount).toBe(1500);
    expect(overallBudgetPeriod).toBe('annual');
  });

  it('configures the finance scroll view for reliable touch scrolling', () => {
    const { getByTestId } = render(<FinancesScreen />);
    const scrollView = getByTestId('finances-scroll-view');

    expect(scrollView.props.keyboardDismissMode).toBe('on-drag');
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.scrollEnabled).toBe(true);
  });
});
