import { fireEvent, render } from '@testing-library/react-native';

import { CategoryBudgetModal } from '../CategoryBudgetModal';
import { useFinanceStore } from '@/stores/financeStore';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    danger: '#ef4444',
    success: '#10b981',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

jest.mock('@/components/ui/Modal', () => ({
  Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  const MockIonicons = ({ testID }: { testID?: string }) =>
    React.createElement(Text, { testID: testID ?? 'mock-ionicon' }, 'icon');

  (MockIonicons as unknown as { font: Record<string, unknown> }).font = {
    ionicons: 'mock-ionicons-font',
  };

  return {
    __esModule: true,
    default: MockIonicons,
  };
});

function seedFinanceStore() {
  useFinanceStore.setState({
    categories: [{ id: 'cat-food', name: 'Food', color: '#f97316' }],
    budgets: [],
    expenses: [],
    notifiedBudgetThresholdByKey: {},
    overallBudgetAmount: 0,
    overallBudgetPeriod: 'monthly',
  });
}

describe('CategoryBudgetModal', () => {
  beforeEach(() => {
    seedFinanceStore();
  });

  it('renders category budget input and saves entered limit', () => {
    const { getByPlaceholderText } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);

    const budgetInput = getByPlaceholderText('0');
    fireEvent(budgetInput, 'endEditing', { nativeEvent: { text: '125.5' } });

    const month = new Date().toISOString().slice(0, 7);
    const budget = useFinanceStore
      .getState()
      .budgets.find((entry) => entry.categoryId === 'cat-food' && entry.month === month);

    expect(budget?.monthlyLimit).toBe(125.5);
  });

  it('shows edit form when pencil icon is pressed', () => {
    const { getAllByText, getByDisplayValue } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );

    // There are multiple 'icon' texts (from MockIonicons). Press the pencil (2nd icon = edit).
    const icons = getAllByText('icon');
    // icons order: cash-outline, pencil-outline, trash-outline
    fireEvent.press(icons[1]);

    expect(getByDisplayValue('Food')).toBeTruthy();
  });

  it('saves edited category name and color', () => {
    const { getAllByText, getByDisplayValue, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );

    const icons = getAllByText('icon');
    fireEvent.press(icons[1]);

    const nameInput = getByDisplayValue('Food');
    fireEvent.changeText(nameInput, 'Groceries');
    fireEvent.press(getByText('Save'));

    expect(useFinanceStore.getState().categories[0].name).toBe('Groceries');
  });

  it('cancels edit without saving', () => {
    const { getAllByText, getByDisplayValue, getByText, queryByDisplayValue } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );

    const icons = getAllByText('icon');
    fireEvent.press(icons[1]);

    const nameInput = getByDisplayValue('Food');
    fireEvent.changeText(nameInput, 'Changed Name');
    fireEvent.press(getByText('Cancel'));

    expect(queryByDisplayValue('Changed Name')).toBeNull();
    expect(useFinanceStore.getState().categories[0].name).toBe('Food');
  });
});
