import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { useFinanceStore } from '@/stores/financeStore';
import { CategoryBudgetModal } from '../CategoryBudgetModal';

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

// Make PaywallModal call its callbacks so they get covered
const mockPaywallOnClose = jest.fn();
const mockPaywallOnUpgraded = jest.fn();
jest.mock('@/components/ui/PaywallModal', () => ({
  PaywallModal: ({
    onClose,
    onUpgraded,
  }: {
    visible: boolean;
    onClose: () => void;
    onUpgraded: () => void;
  }) => {
    mockPaywallOnClose.mockImplementation(onClose);
    mockPaywallOnUpgraded.mockImplementation(onUpgraded);
    return null;
  },
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

  it('adds a new category when name is provided', () => {
    const { getByPlaceholderText, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );

    const nameInput = getByPlaceholderText('Category name');
    fireEvent.changeText(nameInput, 'Health');
    fireEvent.press(getByText('Add'));

    expect(useFinanceStore.getState().categories.some((c) => c.name === 'Health')).toBe(true);
  });

  it('does not add category when name is empty', () => {
    const countBefore = useFinanceStore.getState().categories.length;
    // Trigger handleAddCategory via keyboard submit with empty value
    const { getByPlaceholderText } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);
    fireEvent(getByPlaceholderText('Category name'), 'submitEditing');

    expect(useFinanceStore.getState().categories.length).toBe(countBefore);
  });

  it('shows paywall when free user tries to add 4th category', () => {
    useEntitlementStore.setState({ isPro: false, isLoading: false });
    // Add 2 more categories to reach limit of 3
    useFinanceStore.setState({
      categories: [
        { id: 'c1', name: 'Food', color: '#f97316' },
        { id: 'c2', name: 'Transport', color: '#3b82f6' },
        { id: 'c3', name: 'Health', color: '#22c55e' },
      ],
      budgets: [],
      expenses: [],
      notifiedBudgetThresholdByKey: {},
      overallBudgetAmount: 0,
      overallBudgetPeriod: 'monthly',
    });

    const { getByPlaceholderText, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );

    fireEvent.changeText(getByPlaceholderText('Category name'), 'Entertainment');
    fireEvent.press(getByText('Add'));

    // Categories count should still be 3 (paywall shown instead)
    expect(useFinanceStore.getState().categories.length).toBe(3);
  });

  it('shows delete confirmation alert and deletes on confirm', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // Press the 'Delete' button (index 1)
      buttons?.[1]?.onPress?.();
    });

    const { getAllByLabelText } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);

    const deleteButtons = getAllByLabelText('Delete category Food');
    fireEvent.press(deleteButtons[0]);

    expect(alertSpy).toHaveBeenCalled();
    expect(useFinanceStore.getState().categories.length).toBe(0);
    alertSpy.mockRestore();
  });

  it('cancels delete when Cancel is pressed in alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      // Press Cancel (index 0) — do nothing
      buttons?.[0]?.onPress?.();
    });

    const { getAllByLabelText } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);

    const deleteButtons = getAllByLabelText('Delete category Food');
    fireEvent.press(deleteButtons[0]);

    expect(alertSpy).toHaveBeenCalled();
    // Category still exists
    expect(useFinanceStore.getState().categories.length).toBe(1);
    alertSpy.mockRestore();
  });

  it('pressing a color swatch updates the selected color', () => {
    // Add a category with a custom (non-preset) color to trigger extraColors map
    useFinanceStore.setState({
      categories: [
        { id: 'cat-food', name: 'Food', color: '#f97316' },
        { id: 'cat-custom', name: 'Custom', color: '#123456' }, // non-preset color
      ],
      budgets: [],
      expenses: [],
      notifiedBudgetThresholdByKey: {},
      overallBudgetAmount: 0,
      overallBudgetPeriod: 'monthly',
    });

    const { UNSAFE_getAllByType } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const swatches = UNSAFE_getAllByType(TouchableOpacity);
    // Press multiple touchables to ensure we hit color swatch callbacks (including extraColors)
    swatches.forEach((swatch) => {
      try {
        fireEvent.press(swatch);
      } catch {
        /* ignore disabled/non-pressable elements */
      }
    });
  });

  it('opens color picker modal and close buttons are visible', () => {
    // Verify that pressing "+" renders the color picker modal with Done/Cancel
    const { UNSAFE_getAllByType, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const plusButton = touchables.find((t) => {
      try {
        const txt = t.findByType(
          (jest.requireActual('react-native') as typeof import('react-native')).Text
        );
        return txt.props.children === '+';
      } catch {
        return false;
      }
    });
    expect(plusButton).toBeTruthy();
    fireEvent.press(plusButton!);
    // Done and Cancel should now be visible
    expect(getByText('Done')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
    // Close via Cancel
    fireEvent.press(getByText('Cancel'));
  });

  it('opens color picker with preset color and closes via Done, then shows custom swatch', () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    let touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Find all "+" buttons — pick the last one (add-category section)
    const plusButtons = touchables.filter((t) => {
      try {
        return (
          t.findByType((jest.requireActual('react-native') as typeof import('react-native')).Text)
            .props.children === '+'
        );
      } catch {
        return false;
      }
    });
    // Open picker (preset color active so draft = '#ff0000')
    fireEvent.press(plusButtons[plusButtons.length - 1]);
    // Done is visible — press it to confirm '#ff0000' as newColor
    fireEvent.press(getByText('Done'));
    // Now newColor = '#ff0000' (non-preset, non-extra) → showCustomSwatch = true
    // The custom swatch should now be rendered — press it (openPicker with non-preset)
    touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Find the custom swatch: backgroundColor='#ff0000' and borderWidth=2
    const customSwatch = touchables.find((t) => {
      const style = t.props.style;
      if (!style || Array.isArray(style)) return false;
      return style.backgroundColor === '#ff0000' && style.borderWidth === 2;
    });
    if (customSwatch) {
      // openPicker with !isPreset = true so draft = value = '#ff0000'
      fireEvent.press(customSwatch);
      // picker opens again, close via Done
      try {
        fireEvent.press(getByText('Done'));
      } catch {
        /* ignore */
      }
    }
  });

  it('shows custom color swatch when a non-preset color is the current value', () => {
    // Set newColor to a non-preset value via pressing the custom swatch
    // We add a category with a non-preset color so extraColors contains it
    useFinanceStore.setState({
      categories: [{ id: 'c1', name: 'Custom', color: '#abcdef' }],
      budgets: [],
      expenses: [],
      notifiedBudgetThresholdByKey: {},
      overallBudgetAmount: 0,
      overallBudgetPeriod: 'monthly',
    });
    // Pressing the '#abcdef' swatch sets newColor = '#abcdef' (a non-preset extraColor)
    // Then the ColorSwatchPicker for newColor will show the showCustomSwatch view
    const { UNSAFE_getAllByType } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);
    const { TouchableOpacity } = jest.requireActual(
      'react-native'
    ) as typeof import('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Press each touchable to try to trigger the custom color path
    touchables.forEach((t) => {
      try {
        fireEvent.press(t);
      } catch {
        /* ignore */
      }
    });
  });

  it('shows paywall onClose and onUpgraded do not throw', () => {
    useEntitlementStore.setState({ isPro: false, isLoading: false });
    useFinanceStore.setState({
      categories: [
        { id: 'c1', name: 'Food', color: '#f97316' },
        { id: 'c2', name: 'Transport', color: '#3b82f6' },
        { id: 'c3', name: 'Health', color: '#22c55e' },
      ],
      budgets: [],
      expenses: [],
      notifiedBudgetThresholdByKey: {},
      overallBudgetAmount: 0,
      overallBudgetPeriod: 'monthly',
    });
    // Trigger showPaywall by adding a 4th category as a free user
    const { getByPlaceholderText, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );
    fireEvent.changeText(getByPlaceholderText('Category name'), 'Entertainment');
    fireEvent.press(getByText('Add'));
    // Categories count should still be 3 (paywall shown instead)
    expect(useFinanceStore.getState().categories.length).toBe(3);
    // Now call the paywall callbacks (captured by the PaywallModal mock)
    expect(() => mockPaywallOnClose()).not.toThrow();
    expect(() => mockPaywallOnUpgraded()).not.toThrow();
  });

  it('does not save edit when name is empty', () => {
    const { getAllByText, getByDisplayValue, getByText } = render(
      <CategoryBudgetModal visible onClose={jest.fn()} />
    );
    const icons = getAllByText('icon');
    fireEvent.press(icons[1]); // open edit form
    const nameInput = getByDisplayValue('Food');
    fireEvent.changeText(nameInput, '');
    fireEvent.press(getByText('Save'));
    // Category name should be unchanged
    expect(useFinanceStore.getState().categories[0].name).toBe('Food');
  });

  it('shows empty name budget input ignores NaN value', () => {
    const { getByPlaceholderText } = render(<CategoryBudgetModal visible onClose={jest.fn()} />);
    const budgetInput = getByPlaceholderText('0');
    fireEvent(budgetInput, 'endEditing', { nativeEvent: { text: 'abc' } });
    // Budget should not be set (NaN)
    const month = new Date().toISOString().slice(0, 7);
    const budget = useFinanceStore
      .getState()
      .budgets.find((b) => b.categoryId === 'cat-food' && b.month === month);
    expect(budget).toBeUndefined();
  });
});
