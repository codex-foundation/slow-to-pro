import { fireEvent, render } from '@testing-library/react-native';
import { useTaskStore } from '@/stores/taskStore';
import { ManageCategoriesModal } from '../ManageCategoriesModal';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name?: string }) =>
      React.createElement(Text, { testID: `icon-${name}` }, name),
  };
});

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    bg: '#fff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    primary: '#2563eb',
    danger: '#ef4444',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

jest.mock('@/components/ui/Modal', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Modal: ({
      visible,
      children,
    }: {
      visible: boolean;
      onClose: () => void;
      title?: string;
      children: React.ReactNode;
    }) => (visible ? React.createElement(View, { testID: 'modal-wrapper' }, children) : null),
  };
});

beforeEach(() => {
  useTaskStore.setState({ tasks: [], categories: [], lastResetDate: '2026-03-01' });
  jest.clearAllMocks();
});

describe('ManageCategoriesModal', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(<ManageCategoriesModal visible={false} onClose={jest.fn()} />);
    expect(queryByTestId('modal-wrapper')).toBeNull();
  });

  it('shows empty state message when no categories', () => {
    const { getByText } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);
    expect(getByText('No categories yet')).toBeTruthy();
  });

  it('renders existing categories', () => {
    useTaskStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-1', name: 'Work', color: '#6366f1' }],
    }));
    const { getByText } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);
    expect(getByText('Work')).toBeTruthy();
  });

  it('adds a category when name is entered and submit is pressed', () => {
    const { getByTestId } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);

    fireEvent.changeText(getByTestId('new-category-name-input'), 'Personal');
    fireEvent.press(getByTestId('add-category-submit'));

    const { categories } = useTaskStore.getState();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Personal');
  });

  it('does not add a category when name is empty', () => {
    const { getByTestId } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);
    fireEvent.press(getByTestId('add-category-submit'));
    expect(useTaskStore.getState().categories).toHaveLength(0);
  });

  it('clears input after adding a category', () => {
    const { getByTestId } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);

    fireEvent.changeText(getByTestId('new-category-name-input'), 'Gym');
    fireEvent.press(getByTestId('add-category-submit'));

    const input = getByTestId('new-category-name-input');
    expect(input.props.value).toBe('');
  });

  it('selects a color swatch when pressed', () => {
    const { getByTestId } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);
    // Press a color that is not the default (#ef4444)
    fireEvent.press(getByTestId('color-swatch-#22c55e'));
    // Then add a category to verify selected color is used
    fireEvent.changeText(getByTestId('new-category-name-input'), 'Health');
    fireEvent.press(getByTestId('add-category-submit'));
    expect(useTaskStore.getState().categories[0].color).toBe('#22c55e');
  });

  it('deletes a category when trash button is pressed', () => {
    useTaskStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-1', name: 'Work', color: '#6366f1' }],
    }));
    const { getByLabelText } = render(<ManageCategoriesModal visible onClose={jest.fn()} />);
    fireEvent.press(getByLabelText('Delete category Work'));
    expect(useTaskStore.getState().categories).toHaveLength(0);
  });

  it('enters edit mode when pencil button is pressed', () => {
    useTaskStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-1', name: 'Work', color: '#6366f1' }],
    }));
    const { getByLabelText, queryByDisplayValue } = render(
      <ManageCategoriesModal visible onClose={jest.fn()} />
    );
    fireEvent.press(getByLabelText('Edit category Work'));
    expect(queryByDisplayValue('Work')).toBeTruthy();
  });

  it('saves the renamed category on submit', () => {
    useTaskStore.setState((s) => ({
      ...s,
      categories: [{ id: 'cat-1', name: 'Work', color: '#6366f1' }],
    }));
    const { getByLabelText, getByDisplayValue } = render(
      <ManageCategoriesModal visible onClose={jest.fn()} />
    );
    fireEvent.press(getByLabelText('Edit category Work'));
    fireEvent.changeText(getByDisplayValue('Work'), 'Work Updated');
    fireEvent(getByDisplayValue('Work Updated'), 'submitEditing');
    expect(useTaskStore.getState().categories[0].name).toBe('Work Updated');
  });
});
