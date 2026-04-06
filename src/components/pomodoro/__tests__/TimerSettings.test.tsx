import { fireEvent, render } from '@testing-library/react-native';
import { usePomodoroStore } from '@/stores/pomodoroStore';
import { TimerSettings } from '../TimerSettings';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    primary: '#007AFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F5F5',
    border: '#E0E0E0',
    text: '#000000',
    textMuted: '#666666',
    textSubtle: '#999999',
  }),
}));

jest.mock('@/stores/pomodoroStore', () => {
  const mockUpdateDurations = jest.fn();
  return {
    usePomodoroStore: jest.fn((selector) =>
      selector({
        workDuration: 25,
        breakDuration: 5,
        updateDurations: mockUpdateDurations,
      })
    ),
    _mockUpdateDurations: mockUpdateDurations,
  };
});

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
      title: string;
      children: React.ReactNode;
    }) => (visible ? React.createElement(View, { testID: 'modal' }, children) : null),
  };
});

function getUpdateDurationsMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jest.requireMock('@/stores/pomodoroStore') as any)._mockUpdateDurations as jest.Mock;
}

describe('TimerSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders focus and break inputs with current durations', () => {
    const { getByDisplayValue } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    expect(getByDisplayValue('25')).toBeTruthy();
    expect(getByDisplayValue('5')).toBeTruthy();
  });

  it('calls updateDurations with parsed values when Save is pressed', () => {
    const onClose = jest.fn();
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={onClose} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '30');
    fireEvent.changeText(getByDisplayValue('5'), '10');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(30, 10);
    expect(onClose).toHaveBeenCalled();
  });

  it('clamps focus input below 1 to 1', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '0');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(1, 5);
  });

  it('clamps focus input above 60 to 60', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), '99');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(60, 5);
  });

  it('falls back to default focus value for non-numeric input', () => {
    const { getByDisplayValue, getByText } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByDisplayValue('25'), 'abc');
    fireEvent.press(getByText('Save'));
    expect(getUpdateDurationsMock()).toHaveBeenCalledWith(25, 5);
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(
      <TimerSettings visible={false} onClose={jest.fn()} />
    );
    expect(queryByTestId('modal')).toBeNull();
  });

  it('resets inputs to current store values when modal reopens', () => {
    const { usePomodoroStore: mockStore } = jest.requireMock('@/stores/pomodoroStore') as {
      usePomodoroStore: jest.Mock;
    };
    mockStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        workDuration: 30,
        breakDuration: 10,
        updateDurations: jest.fn(),
      })
    );
    const { getByDisplayValue } = render(
      <TimerSettings visible={true} onClose={jest.fn()} />
    );
    expect(getByDisplayValue('30')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy();
  });
});
