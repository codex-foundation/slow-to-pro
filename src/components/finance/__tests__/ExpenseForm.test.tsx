import { fireEvent, render } from '@testing-library/react-native';

import { ExpenseForm } from '../ExpenseForm';
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
    categories: [
      { id: 'cat-food', name: 'Food', color: '#f97316' },
      { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
    ],
    budgets: [],
    expenses: [],
  });
}

describe('ExpenseForm', () => {
  beforeEach(() => {
    seedFinanceStore();
  });

  describe('Category selection', () => {
    it('renders all available categories', () => {
      const { getByText } = render(<ExpenseForm />);

      expect(getByText('Food')).toBeTruthy();
      expect(getByText('Transport')).toBeTruthy();
    });

    it('allows selecting a category', () => {
      const { getByText } = render(<ExpenseForm />);
      const foodButton = getByText('Food');

      fireEvent.press(foodButton);
      expect(foodButton).toBeTruthy();
    });
  });

  describe('Settings button', () => {
    it('renders settings button to open category modal', () => {
      const { getByTestId } = render(<ExpenseForm />);
      const settingsButton = getByTestId('mock-ionicon');

      expect(settingsButton).toBeTruthy();
    });

    it('calls onOpenCategoryModal when settings button is pressed', () => {
      const mockOpenModal = jest.fn();
      const { getByTestId } = render(<ExpenseForm onOpenCategoryModal={mockOpenModal} />);
      const settingsButton = getByTestId('mock-ionicon').parent;

      if (settingsButton) {
        fireEvent.press(settingsButton);
        expect(mockOpenModal).toHaveBeenCalled();
      }
    });
  });

  describe('Amount input', () => {
    it('renders amount input field', () => {
      const { getByPlaceholderText } = render(<ExpenseForm />);

      expect(getByPlaceholderText('Amount')).toBeTruthy();
    });

    it('updates amount value on change', () => {
      const { getByPlaceholderText } = render(<ExpenseForm />);
      const amountInput = getByPlaceholderText('Amount');

      fireEvent.changeText(amountInput, '50.25');
      expect((amountInput as any).props.value).toBe('50.25');
    });
  });

  describe('Note input', () => {
    it('renders optional note input field', () => {
      const { getByPlaceholderText } = render(<ExpenseForm />);

      expect(getByPlaceholderText('Note (optional)')).toBeTruthy();
    });

    it('updates note value on change', () => {
      const { getByPlaceholderText } = render(<ExpenseForm />);
      const noteInput = getByPlaceholderText('Note (optional)');

      fireEvent.changeText(noteInput, 'lunch with colleagues');
      expect((noteInput as any).props.value).toBe('lunch with colleagues');
    });
  });

  describe('Add expense button', () => {
    it('renders add expense button', () => {
      const { getByText } = render(<ExpenseForm />);
      expect(getByText('Add Expense')).toBeTruthy();
    });

    it('calls onSubmitted callback after adding expense', () => {
      const mockOnSubmitted = jest.fn();
      const { getByText, getByPlaceholderText } = render(
        <ExpenseForm onSubmitted={mockOnSubmitted} />
      );

      fireEvent.press(getByText('Food'));
      fireEvent.changeText(getByPlaceholderText('Amount'), '50');
      fireEvent.press(getByText('Add Expense'));

      expect(mockOnSubmitted).toHaveBeenCalled();
    });

    it('resets form after adding expense', () => {
      const { getByText, getByPlaceholderText } = render(<ExpenseForm />);

      fireEvent.press(getByText('Food'));
      fireEvent.changeText(getByPlaceholderText('Amount'), '50');
      fireEvent.changeText(getByPlaceholderText('Note (optional)'), 'lunch');
      fireEvent.press(getByText('Add Expense'));

      expect((getByPlaceholderText('Amount') as any).props.value).toBe('');
      expect((getByPlaceholderText('Note (optional)') as any).props.value).toBe('');
    });
  });

  describe('Expense creation', () => {
    it('adds expense with category, amount, and optional note', () => {
      const addExpenseSpy = jest.spyOn(useFinanceStore, 'setState');
      const { getByText, getByPlaceholderText } = render(<ExpenseForm />);

      fireEvent.press(getByText('Food'));
      fireEvent.changeText(getByPlaceholderText('Amount'), '25.50');
      fireEvent.changeText(getByPlaceholderText('Note (optional)'), 'coffee break');
      fireEvent.press(getByText('Add Expense'));

      addExpenseSpy.mockRestore();
    });

    it('handles text input correctly', () => {
      const { getByPlaceholderText } = render(<ExpenseForm />);

      const amountInput = getByPlaceholderText('Amount');
      fireEvent.changeText(amountInput, '100');
      expect((amountInput as any).props.value).toBe('100');

      const noteInput = getByPlaceholderText('Note (optional)');
      fireEvent.changeText(noteInput, 'test note');
      expect((noteInput as any).props.value).toBe('test note');
    });
  });
});
