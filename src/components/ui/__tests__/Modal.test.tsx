import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, Text } from 'react-native';

import { Modal } from '../Modal';

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
    primary: '#007AFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
    overlay: 'rgba(0,0,0,0.5)',
    background: '#F2F2F7',
  }),
}));

describe('Modal', () => {
  it('renders title and children when visible', () => {
    const { getByText } = render(
      <Modal visible={true} onClose={jest.fn()} title="Test Title">
        <Text>Modal content</Text>
      </Modal>
    );
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Modal content')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="My Modal">
        <Text>content</Text>
      </Modal>
    );
    // Both backdrop and close icon have accessibilityLabel "Close modal"; pick the last one (close button)
    const closeButtons = getAllByLabelText('Close modal');
    fireEvent.press(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is pressed and keyboard is not visible', () => {
    const onClose = jest.fn();
    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="Backdrop Test">
        <Text>content</Text>
      </Modal>
    );
    // The backdrop TouchableOpacity also has accessibilityLabel "Close modal"
    const elements = getAllByLabelText('Close modal');
    // Backdrop is the first element (rendered first in JSX)
    fireEvent.press(elements[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls Keyboard.dismiss when backdrop is pressed and keyboard is visible', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    const onClose = jest.fn();

    // Capture keyboardDidShow listener via addListener spy
    let keyboardShowHandler: (() => void) | undefined;
    const addListenerSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event: string, handler: (event: unknown) => void) => {
        if (event === 'keyboardDidShow') keyboardShowHandler = handler as () => void;
        return { remove: jest.fn() };
      });

    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="Keyboard Test">
        <Text>content</Text>
      </Modal>
    );

    // Simulate keyboard show
    act(() => {
      keyboardShowHandler?.();
    });

    const elements = getAllByLabelText('Close modal');
    fireEvent.press(elements[0]);

    expect(dismissSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    addListenerSpy.mockRestore();
    dismissSpy.mockRestore();
  });

  it('subscribes and unsubscribes keyboard listeners on mount/unmount', () => {
    const addListenerSpy = jest.spyOn(Keyboard, 'addListener');

    const { unmount } = render(
      <Modal visible={true} onClose={jest.fn()} title="Listener Test">
        <Text>content</Text>
      </Modal>
    );

    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));

    // The subscriptions should be removed on unmount without errors
    expect(() => unmount()).not.toThrow();

    addListenerSpy.mockRestore();
  });

  it('sets keyboardVisible=false when keyboardDidHide fires', () => {
    const onClose = jest.fn();
    let keyboardShowHandler: (() => void) | undefined;
    let keyboardHideHandler: (() => void) | undefined;
    const addListenerSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((event: string, handler: (event: unknown) => void) => {
        if (event === 'keyboardDidShow') keyboardShowHandler = handler as () => void;
        if (event === 'keyboardDidHide') keyboardHideHandler = handler as () => void;
        return { remove: jest.fn() };
      });

    const { getAllByLabelText } = render(
      <Modal visible={true} onClose={onClose} title="Hide Test">
        <Text>content</Text>
      </Modal>
    );

    // Show then hide keyboard — keyboardVisible goes false
    act(() => {
      keyboardShowHandler?.();
    });
    act(() => {
      keyboardHideHandler?.();
    });

    // After keyboard hides, pressing backdrop should call onClose (not dismiss)
    const elements = getAllByLabelText('Close modal');
    fireEvent.press(elements[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    addListenerSpy.mockRestore();
  });
});
