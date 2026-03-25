import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Modal } from '../Modal.web';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text: RNText } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name?: string; testID?: string }) =>
      React.createElement(RNText, { testID: testID ?? `icon-${name}` }, name ?? 'icon'),
  };
});

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#2563eb',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

describe('Modal.web', () => {
  it('renders title and children when visible', () => {
    const { getByText } = render(
      <Modal visible={true} onClose={jest.fn()} title="Test Title">
        <Text>Modal content</Text>
      </Modal>
    );
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Modal content')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(
      <Modal visible={false} onClose={jest.fn()} title="Hidden">
        <Text>Hidden content</Text>
      </Modal>
    );
    expect(queryByText('Hidden content')).toBeNull();
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="Backdrop Test">
        <Text>content</Text>
      </Modal>
    );
    // Backdrop is the first element with this label.
    // On web the backdrop is a View with onClick (not onPress) so we fire a click event.
    const elements = getAllByLabelText('Close modal');
    fireEvent(elements[0], 'click');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="Close Button Test">
        <Text>content</Text>
      </Modal>
    );
    // Close button is the last element with this label
    const elements = getAllByLabelText('Close modal');
    fireEvent.press(elements[elements.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the card body is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <Modal visible={true} onClose={onClose} title="Card Test">
        <Text>inner content</Text>
      </Modal>
    );
    // The title is inside the card — pressing it should not trigger backdrop close
    fireEvent.press(getByText('Card Test'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders children inside a ScrollView', () => {
    const { UNSAFE_getByType } = render(
      <Modal visible={true} onClose={jest.fn()} title="Scroll Test">
        <Text>scrollable content</Text>
      </Modal>
    );
    const { ScrollView } = jest.requireActual('react-native') as typeof import('react-native');
    expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
  });

  it('does not call onClose when Space key is fired inside modal content', () => {
    // Regression: backdrop previously had accessibilityRole="button" which made
    // the underlying div[role="button"] fire a click on Space (WAI-ARIA spec),
    // causing any Space keydown from a child TextInput to close the modal.
    const onClose = jest.fn();
    const { getByText } = render(
      <Modal visible={true} onClose={onClose} title="Space Key Test">
        <Text testID="inner-text">Some content</Text>
      </Modal>
    );
    fireEvent(getByText('Some content'), 'keyDown', { key: ' ', code: 'Space' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('backdrop does not have role="button" (prevents Space key activation)', () => {
    // Ensures accessibilityRole="button" is not set on the backdrop.
    // role="button" on a div causes Space to fire a click regardless of tabIndex.
    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={jest.fn()} title="Role Test">
        <Text>content</Text>
      </Modal>
    );
    const backdrop = getAllByLabelText('Close modal')[0];
    expect(backdrop.props.accessibilityRole).not.toBe('button');
  });
});
