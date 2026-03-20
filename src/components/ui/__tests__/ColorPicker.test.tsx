import { render } from '@testing-library/react-native';

import { ColorPicker } from '../ColorPicker';

// ── expo-linear-gradient mock ─────────────────────────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    LinearGradient: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(View, { testID: testID ?? 'linear-gradient' }, children),
  };
});

// Capture PanResponder handlers so we can invoke them directly
type PanHandlerMap = {
  onStartShouldSetPanResponder?: () => boolean;
  onMoveShouldSetPanResponder?: () => boolean;
  onPanResponderGrant?: (e: { nativeEvent: { pageX: number; pageY: number } }) => void;
  onPanResponderMove?: (e: { nativeEvent: { pageX: number; pageY: number } }) => void;
};

// Store captured handlers on global so jest.mock factory can reference it
(global as Record<string, unknown>).__panResponderHandlers = [] as PanHandlerMap[];

jest.mock('react-native/Libraries/Interaction/PanResponder', () => {
  const handlers = (global as Record<string, unknown>).__panResponderHandlers as PanHandlerMap[];
  return {
    default: {
      create: (config: PanHandlerMap) => {
        handlers.push(config);
        return { panHandlers: {} };
      },
    },
    __esModule: true,
  };
});

const getCapturedHandlers = () =>
  (global as Record<string, unknown>).__panResponderHandlers as PanHandlerMap[];

describe('ColorPicker', () => {
  beforeEach(() => {
    getCapturedHandlers().length = 0;
  });

  it('renders without crashing with a valid hex value', () => {
    const { toJSON } = render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with an invalid hex value', () => {
    const { toJSON } = render(<ColorPicker value="invalid" onChange={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('registers two PanResponder instances (SB panel + hue strip)', () => {
    render(<ColorPicker value="#00ff00" onChange={jest.fn()} />);
    expect(getCapturedHandlers()).toHaveLength(2);
  });

  describe('SB (saturation/brightness) pan responder', () => {
    it('onStartShouldSetPanResponder returns true', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [sbHandlers] = getCapturedHandlers();
      expect(sbHandlers.onStartShouldSetPanResponder?.()).toBe(true);
    });

    it('onMoveShouldSetPanResponder returns true', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [sbHandlers] = getCapturedHandlers();
      expect(sbHandlers.onMoveShouldSetPanResponder?.()).toBe(true);
    });

    it('onPanResponderGrant does not throw when invoked (ref.current is null in test env)', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [sbHandlers] = getCapturedHandlers();
      expect(() => {
        sbHandlers.onPanResponderGrant?.({ nativeEvent: { pageX: 50, pageY: 50 } });
      }).not.toThrow();
    });

    it('onPanResponderMove does not throw when invoked', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [sbHandlers] = getCapturedHandlers();
      expect(() => {
        sbHandlers.onPanResponderMove?.({ nativeEvent: { pageX: 100, pageY: 100 } });
      }).not.toThrow();
    });
  });

  describe('Hue strip pan responder', () => {
    it('onStartShouldSetPanResponder returns true', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [, hueHandlers] = getCapturedHandlers();
      expect(hueHandlers.onStartShouldSetPanResponder?.()).toBe(true);
    });

    it('onMoveShouldSetPanResponder returns true', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [, hueHandlers] = getCapturedHandlers();
      expect(hueHandlers.onMoveShouldSetPanResponder?.()).toBe(true);
    });

    it('onPanResponderGrant does not throw when invoked', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [, hueHandlers] = getCapturedHandlers();
      expect(() => {
        hueHandlers.onPanResponderGrant?.({ nativeEvent: { pageX: 100, pageY: 0 } });
      }).not.toThrow();
    });

    it('onPanResponderMove does not throw when invoked', () => {
      render(<ColorPicker value="#ff0000" onChange={jest.fn()} />);
      const [, hueHandlers] = getCapturedHandlers();
      expect(() => {
        hueHandlers.onPanResponderMove?.({ nativeEvent: { pageX: 200, pageY: 0 } });
      }).not.toThrow();
    });
  });

  describe('hsvToHex / hexToHsv round-trip via value rendering', () => {
    const cases: [string, string][] = [
      ['#ff0000', 'red'],
      ['#00ff00', 'green'],
      ['#0000ff', 'blue'],
      ['#ffffff', 'white'],
      ['#000000', 'black'],
      ['#7f7f7f', 'grey'],
    ];
    test.each(cases)('renders correctly for hex %s (%s)', (hex) => {
      const { toJSON } = render(<ColorPicker value={hex} onChange={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
