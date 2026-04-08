import { fireEvent, render } from '@testing-library/react-native';
import { MonthPicker } from '../MonthPicker';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name?: string; testID?: string }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}` }, name),
  };
});

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
  }),
}));

describe('MonthPicker', () => {
  it('renders the formatted month label', () => {
    const { getByText } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={jest.fn()} disableNext={false} />
    );
    expect(getByText('March 2026')).toBeTruthy();
  });

  it('calls onPrev when the left chevron is pressed', () => {
    const onPrev = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={onPrev} onNext={jest.fn()} disableNext={false} />
    );
    fireEvent.press(getByTestId('month-picker-prev'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when the right chevron is pressed', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={onNext} disableNext={false} />
    );
    fireEvent.press(getByTestId('month-picker-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables the next button when disableNext is true', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <MonthPicker month="2026-03" onPrev={jest.fn()} onNext={onNext} disableNext={true} />
    );
    fireEvent.press(getByTestId('month-picker-next'));
    expect(onNext).not.toHaveBeenCalled();
  });
});
