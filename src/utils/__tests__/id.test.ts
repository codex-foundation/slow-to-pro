import { generateId } from '../id';

describe('generateId', () => {
  it('uses crypto.randomUUID when available', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUID = jest.fn(() => 'uuid-from-crypto');

    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID },
      configurable: true,
    });

    expect(generateId()).toBe('uuid-from-crypto');
    expect(randomUUID).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });

  it('falls back to timestamp-random id when crypto is unavailable', () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    });

    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);

    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });
});
