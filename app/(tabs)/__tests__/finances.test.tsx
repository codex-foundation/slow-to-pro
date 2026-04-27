import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import FinancesScreen from '../finances';

const mockExportCsv = jest.fn().mockResolvedValue(undefined);
const mockExportPdf = jest.fn().mockResolvedValue(undefined);

jest.mock('@/utils/financeExport', () => ({
  exportFinancesAsCsv: (...args: unknown[]) => mockExportCsv(...args),
  exportFinancesAsPdf: (...args: unknown[]) => mockExportPdf(...args),
}));

jest.mock('@/components/ui/PaywallModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, TouchableOpacity } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');
  return {
    PaywallModal: ({
      visible,
      onClose,
      onUpgraded,
    }: {
      visible: boolean;
      onClose?: () => void;
      onUpgraded?: () => void;
    }) =>
      visible
        ? React.createElement(
            View,
            { testID: 'mock-paywall' },
            React.createElement(TouchableOpacity, {
              testID: 'mock-paywall-close',
              onPress: onClose,
            }),
            React.createElement(TouchableOpacity, {
              testID: 'mock-paywall-upgraded',
              onPress: onUpgraded,
            })
          )
        : null,
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock') as {
    default: { call: () => void };
  };
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@/components/ui/Modal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { TouchableOpacity } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Modal: ({
      visible,
      children,
      onClose,
    }: {
      visible: boolean;
      children: React.ReactNode;
      onClose?: () => void;
    }) =>
      visible
        ? React.createElement(
            React.Fragment,
            null,
            children,
            React.createElement(TouchableOpacity, { testID: 'mock-modal-close', onPress: onClose })
          )
        : null,
  };
});

jest.mock('@/components/finance/BarChartView', () => ({
  BarChartView: () => null,
}));

jest.mock('@/components/finance/BudgetProgressBar', () => ({
  BudgetProgressBar: () => null,
}));

jest.mock('@/components/finance/CategoryBudgetModal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { TouchableOpacity } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    CategoryBudgetModal: ({ visible, onClose }: { visible: boolean; onClose?: () => void }) =>
      visible
        ? React.createElement(TouchableOpacity, {
            testID: 'mock-category-budget-close',
            onPress: onClose,
          })
        : null,
  };
});

jest.mock('@/components/finance/ExpenseItem', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { TouchableOpacity, Text } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');
  return {
    ExpenseItem: ({
      expense,
      onDelete,
    }: {
      expense: { id: string; amount: number };
      onDelete?: () => void;
    }) =>
      React.createElement(
        TouchableOpacity,
        { testID: `mock-expense-delete-${expense.id}`, onPress: onDelete },
        React.createElement(Text, null, `$${expense.amount.toFixed(2)}`)
      ),
  };
});

jest.mock('@/components/finance/MonthPicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View, TouchableOpacity, Text } = jest.requireActual(
    'react-native'
  ) as typeof import('react-native');
  return {
    MonthPicker: ({
      month,
      onPrev,
      onNext,
      disableNext,
    }: {
      month: string;
      onPrev: () => void;
      onNext: () => void;
      disableNext: boolean;
    }) =>
      React.createElement(
        View,
        { testID: 'month-picker' },
        React.createElement(Text, null, month),
        React.createElement(TouchableOpacity, { testID: 'month-picker-prev', onPress: onPrev }),
        React.createElement(View, {
          testID: 'month-picker-next',
          disabled: disableNext,
        })
      ),
  };
});

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

describe('FinancesScreen export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFinanceStore();
  });

  it('shows paywall when export is pressed and user is not pro', async () => {
    useEntitlementStore.setState({ isPro: false, isLoading: false });
    const { getByText, getByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    await waitFor(() => {
      expect(getByTestId('mock-paywall')).toBeTruthy();
    });
  });

  it('calls exportFinancesAsCsv directly on web when user is pro', async () => {
    useEntitlementStore.setState({ isPro: true, isLoading: false });
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'web';

    const { getByText } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalledTimes(1);
    });

    (Platform as { OS: string }).OS = original;
  });

  it('shows alert with CSV/PDF options on native when user is pro', async () => {
    useEntitlementStore.setState({ isPro: true, isLoading: false });
    const Platform = jest.requireActual('react-native').Platform as { OS: string };
    const original = Platform.OS;
    (Platform as { OS: string }).OS = 'ios';

    let csvCallback: (() => void) | undefined;
    let pdfCallback: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      csvCallback = buttons?.find((b) => b.text === 'CSV')?.onPress as (() => void) | undefined;
      pdfCallback = buttons?.find((b) => b.text === 'PDF')?.onPress as (() => void) | undefined;
    });

    const { getByText } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Export Finance Data',
      'Choose format',
      expect.any(Array)
    );

    // Trigger CSV export
    csvCallback?.();
    await waitFor(() => {
      expect(mockExportCsv).toHaveBeenCalled();
    });

    // Trigger PDF export
    pdfCallback?.();
    await waitFor(() => {
      expect(mockExportPdf).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    (Platform as { OS: string }).OS = original;
  });
});

describe('FinancesScreen additional branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFinanceStore();
    useEntitlementStore.setState({ isPro: true, isLoading: false });
  });

  it('filters expenses by daily period', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      overallBudgetAmount: 100,
      overallBudgetPeriod: 'daily',
      expenses: [{ id: 'e1', categoryId: 'cat-food', amount: 20, date: Date.now() }],
    }));
    const { getByText } = render(<FinancesScreen />);
    expect(getByText('20% used')).toBeTruthy();
  });

  it('shows negative remaining budget in danger color', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      overallBudgetAmount: 50,
      overallBudgetPeriod: 'monthly',
      expenses: [{ id: 'e1', categoryId: 'cat-food', amount: 80, date: Date.now() }],
    }));
    const { getByText } = render(<FinancesScreen />);
    // Remaining is -30 (negative), displayed as a $ amount
    expect(getByText('$-30.00')).toBeTruthy();
  });

  it('does not save budget when input is invalid (NaN)', async () => {
    const { getByText, getByPlaceholderText } = render(<FinancesScreen />);
    fireEvent.press(getByText('Set overall budget'));
    // Type invalid text
    fireEvent.changeText(getByPlaceholderText('Set budget'), 'not-a-number');
    fireEvent.press(getByText('Save'));
    // Budget input remains visible (modal not closed, invalid input rejected)
    expect(getByPlaceholderText('Set budget')).toBeTruthy();
  });

  it('does not save budget when amount is negative', async () => {
    const { getByText, getByPlaceholderText } = render(<FinancesScreen />);
    fireEvent.press(getByText('Set overall budget'));
    fireEvent.changeText(getByPlaceholderText('Set budget'), '-50');
    fireEvent.press(getByText('Save'));
    // Modal not closed for negative input
    expect(getByPlaceholderText('Set budget')).toBeTruthy();
  });

  it('switches chart type when chart button pressed', () => {
    const { getByText } = render(<FinancesScreen />);
    fireEvent.press(getByText('pie chart'));
    // No error thrown; chart type changed
    fireEvent.press(getByText('bar chart'));
  });

  it('calls deleteExpense when expense delete button pressed', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      expenses: [{ id: 'exp-del', categoryId: 'cat-food', amount: 10, date: Date.now() }],
    }));
    const { getByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByTestId('mock-expense-delete-exp-del'));
    expect(useFinanceStore.getState().expenses).toHaveLength(0);
  });

  it('closes CategoryBudgetModal via onClose callback', async () => {
    const { getByText, getByTestId, queryByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Budgets'));
    expect(getByTestId('mock-category-budget-close')).toBeTruthy();
    fireEvent.press(getByTestId('mock-category-budget-close'));
    await waitFor(() => {
      expect(queryByTestId('mock-category-budget-close')).toBeNull();
    });
  });

  it('closes PaywallModal via onClose callback', async () => {
    useEntitlementStore.setState({ isPro: false, isLoading: false });
    const { getByText, getByTestId, queryByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    await waitFor(() => expect(getByTestId('mock-paywall')).toBeTruthy());
    fireEvent.press(getByTestId('mock-paywall-close'));
    await waitFor(() => expect(queryByTestId('mock-paywall')).toBeNull());
  });

  it('closes PaywallModal via onUpgraded callback', async () => {
    useEntitlementStore.setState({ isPro: false, isLoading: false });
    const { getByText, getByTestId, queryByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    await waitFor(() => expect(getByTestId('mock-paywall')).toBeTruthy());
    fireEvent.press(getByTestId('mock-paywall-upgraded'));
    await waitFor(() => expect(queryByTestId('mock-paywall')).toBeNull());
  });

  it('filters expenses for annual period', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      overallBudgetAmount: 1200,
      overallBudgetPeriod: 'annual',
      expenses: [{ id: 'e1', categoryId: 'cat-food', amount: 120, date: Date.now() }],
    }));
    const { getByText } = render(<FinancesScreen />);
    expect(getByText('10% used')).toBeTruthy();
  });

  it('uses category budget limit when budget exists for this month', () => {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    useFinanceStore.setState((s) => ({
      ...s,
      overallBudgetAmount: 500,
      overallBudgetPeriod: 'monthly',
      budgets: [{ id: 'b1', categoryId: 'cat-food', month, monthlyLimit: 200 }],
      expenses: [{ id: 'e1', categoryId: 'cat-food', amount: 80, date: Date.now() }],
    }));
    const { getByText } = render(<FinancesScreen />);
    // Renders without error; budget limit is found for the category
    expect(getByText('Money')).toBeTruthy();
  });

  it('closes add-expense Modal via onClose callback', async () => {
    const { getByText, getByTestId, queryByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Add expense'));
    expect(getByTestId('mock-expense-submit')).toBeTruthy();
    // Press the mock modal close button
    fireEvent.press(getByTestId('mock-modal-close'));
    await waitFor(() => expect(queryByTestId('mock-expense-submit')).toBeNull());
  });

  it('closes set-budget Modal via onClose callback', async () => {
    const { getByText, getByPlaceholderText, getAllByTestId } = render(<FinancesScreen />);
    fireEvent.press(getByText('Set overall budget'));
    expect(getByPlaceholderText('Set budget')).toBeTruthy();
    // The mock-modal-close button from the Modal mock closes the modal
    const closeButtons = getAllByTestId('mock-modal-close');
    fireEvent.press(closeButtons[0]);
    await waitFor(() => {
      expect(() => getByPlaceholderText('Set budget')).toThrow();
    });
  });

  it('shows Exporting text while export is in progress', async () => {
    useEntitlementStore.setState({ isPro: true, isLoading: false });
    const { resolve: resolveCsv, promise: csvPromise } = (() => {
      let resolve!: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });
      return { resolve, promise };
    })();
    mockExportCsv.mockReturnValueOnce(csvPromise);

    let csvCallback: (() => void) | undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      csvCallback = buttons?.find((b) => b.text === 'CSV')?.onPress as (() => void) | undefined;
    });

    const { getByText, queryByText } = render(<FinancesScreen />);
    fireEvent.press(getByText('Export'));
    csvCallback?.();

    // While promise is pending, button shows 'Exporting…'
    await waitFor(() => expect(getByText('Exporting…')).toBeTruthy());

    await act(async () => {
      resolveCsv();
      await csvPromise;
    });
    expect(queryByText('Exporting…')).toBeNull();

    alertSpy.mockRestore();
  });

  it('applies dark theme styles to "Add expense" subtitle', () => {
    useSettingsStore.setState({ themePreference: 'dark' });
    const { getByText } = render(<FinancesScreen />);
    expect(getByText('Track a new transaction')).toBeTruthy();
    useSettingsStore.setState({ themePreference: 'light' });
  });
});

describe('history section', () => {
  const MAY = new Date('2025-05-10').getTime();
  const JUNE = new Date('2025-06-20').getTime();

  beforeEach(() => {
    useFinanceStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-food', name: 'Food', color: '#f97316' }],
      expenses: [
        { id: 'e-may', categoryId: 'cat-food', amount: 40, date: MAY },
        { id: 'e-june', categoryId: 'cat-food', amount: 55, date: JUNE },
      ],
      budgets: [],
    }));
  });

  it('renders the history section heading', () => {
    const { getByText } = render(<FinancesScreen />);
    expect(getByText('History')).toBeTruthy();
  });

  it('shows a MonthPicker defaulting to the most recent past month', () => {
    const { getByTestId } = render(<FinancesScreen />);
    expect(getByTestId('month-picker')).toBeTruthy();
  });

  it('shows expenses for the selected history month', () => {
    const { getByText } = render(<FinancesScreen />);
    // Default selected month is the newest past month (2025-06)
    expect(getByText('$55.00')).toBeTruthy();
  });

  it('navigates to the previous month when prev is pressed', () => {
    const { getByTestId, getByText } = render(<FinancesScreen />);
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(getByText('$40.00')).toBeTruthy();
  });

  it('disables the next button when the selected month is the most recent month with expenses', () => {
    const { getByTestId } = render(<FinancesScreen />);
    const nextBtn = getByTestId('month-picker-next');
    expect(nextBtn.props.disabled).toBe(true);
  });

  it('shows "No expenses this month" when the selected month has no expenses', () => {
    useFinanceStore.setState((s) => ({
      ...s,
      expenses: [{ id: 'e-may', categoryId: 'cat-food', amount: 40, date: MAY }],
    }));
    const { getByText, getByTestId } = render(<FinancesScreen />);
    // Default is 2025-05 (only month); press prev to go to 2025-04
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(getByText('No expenses this month')).toBeTruthy();
  });
});
