import { fireConfetti } from '../confetti';

describe('fireConfetti (native no-op)', () => {
  it('is callable with no arguments', () => {
    expect(() => fireConfetti()).not.toThrow();
  });

  it('is callable with x and y positions', () => {
    expect(() => fireConfetti(100, 200)).not.toThrow();
  });

  it('returns undefined', () => {
    expect(fireConfetti()).toBeUndefined();
  });
});

describe('fireConfetti (native confetti.ts no-op directly)', () => {
  it('native file exports a callable no-op function', () => {
    jest.isolateModules(() => {
      const { fireConfetti: nativeFireConfetti } =
        // biome-ignore lint/style/noCommonJs: isolateModules requires sync require.
        require('../confetti.ts') as typeof import('../confetti');
      expect(() => nativeFireConfetti()).not.toThrow();
      expect(() => nativeFireConfetti(50, 80)).not.toThrow();
      expect(nativeFireConfetti()).toBeUndefined();
    });
  });
});
