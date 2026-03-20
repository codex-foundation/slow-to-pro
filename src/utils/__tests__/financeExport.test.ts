import { buildCsv, exportFinancesAsCsv, exportFinancesAsPdf } from '../financeExport';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// expo-file-system's File/Paths new API — mock at module level
jest.mock('expo-file-system', () => {
  const mockWrite = jest.fn();
  const mockMove = jest.fn();
  class MockFile {
    uri: string;
    write = mockWrite;
    move = mockMove;
    constructor(...args: (string | { uri: string })[]) {
      this.uri = args.map((a) => (typeof a === 'string' ? a : a.uri)).join('');
    }
  }
  return {
    File: MockFile,
    Paths: { cache: { uri: '/tmp/' } },
  };
});

const categories = [
  { id: 'cat-food', name: 'Food', color: '#f97316' },
  { id: 'cat-travel', name: 'Travel', color: '#3b82f6' },
];

const budgets = [{ id: 'b1', categoryId: 'cat-food', monthlyLimit: 300, month: '2026-03' }];

const expenses = [
  {
    id: 'e1',
    categoryId: 'cat-food',
    amount: 12.5,
    date: new Date('2026-03-10').getTime(),
    note: 'Lunch',
  },
  { id: 'e2', categoryId: 'cat-travel', amount: 50, date: new Date('2026-03-05').getTime() },
  {
    id: 'e3',
    categoryId: 'cat-food',
    amount: 8,
    date: new Date('2026-03-15').getTime(),
    note: 'Coffee, "quick"',
  },
];

describe('buildCsv', () => {
  it('includes EXPENSES and BUDGETS sections', () => {
    const csv = buildCsv(expenses, categories, budgets);
    expect(csv).toContain('EXPENSES');
    expect(csv).toContain('BUDGETS');
  });

  it('sorts expenses newest first', () => {
    const csv = buildCsv(expenses, categories, budgets);
    const lines = csv.split('\n');
    const expenseSection = lines.slice(lines.indexOf('EXPENSES') + 1);
    const dataRows = expenseSection.filter((l) => l.trim() && l !== 'Date,Category,Amount,Note');
    // e3 (Mar 15) should come before e1 (Mar 10) before e2 (Mar 05)
    expect(dataRows[0]).toContain('2026-03-15');
    expect(dataRows[1]).toContain('2026-03-10');
    expect(dataRows[2]).toContain('2026-03-05');
  });

  it('uses category name instead of id', () => {
    const csv = buildCsv(expenses, categories, budgets);
    expect(csv).toContain('Food');
    expect(csv).toContain('Travel');
    expect(csv).not.toContain('cat-food');
  });

  it('formats amounts with 2 decimal places', () => {
    const csv = buildCsv(expenses, categories, budgets);
    expect(csv).toContain('12.50');
    expect(csv).toContain('50.00');
  });

  it('escapes commas and double-quotes in notes', () => {
    const csv = buildCsv(expenses, categories, budgets);
    // 'Coffee, "quick"' should be wrapped in quotes with inner quotes doubled
    expect(csv).toContain('"Coffee, ""quick"""');
  });

  it('falls back to categoryId when category not found', () => {
    const unknownExpenses = [{ id: 'ex', categoryId: 'unknown-cat', amount: 5, date: Date.now() }];
    const csv = buildCsv(unknownExpenses, [], []);
    expect(csv).toContain('unknown-cat');
  });

  it('escapes newlines in field values', () => {
    const newlineExpenses = [
      { id: 'e-nl', categoryId: 'cat-food', amount: 1, date: Date.now(), note: 'line1\nline2' },
    ];
    const csv = buildCsv(newlineExpenses, categories, budgets);
    expect(csv).toContain('"line1\nline2"');
  });

  it('falls back to categoryId for budget when category not found', () => {
    const unknownBudgets = [{ id: 'bu', categoryId: 'ghost-cat', monthlyLimit: 100, month: '2026-04' }];
    const csv = buildCsv([], [], unknownBudgets);
    expect(csv).toContain('ghost-cat');
  });

  it('handles empty expenses and budgets', () => {
    const csv = buildCsv([], [], []);
    expect(csv).toContain('EXPENSES');
    expect(csv).toContain('BUDGETS');
  });

  it('includes budget section with month and limit', () => {
    const csv = buildCsv(expenses, categories, budgets);
    expect(csv).toContain('2026-03');
    expect(csv).toContain('300.00');
  });
});

describe('exportFinancesAsCsv', () => {
  it('calls Sharing.shareAsync with a csv uri', async () => {
    const shareSpy = jest.spyOn(Sharing, 'shareAsync').mockResolvedValue(undefined);
    await exportFinancesAsCsv(expenses, categories, budgets);
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [uri, options] = shareSpy.mock.calls[0];
    expect(uri).toContain('.csv');
    expect(options?.mimeType).toBe('text/csv');
    shareSpy.mockRestore();
  });

  it('uses web download path when Platform.OS is web', async () => {
    // Swap Platform.OS to 'web' by overriding the react-native Platform mock
    const { Platform } = jest.requireActual('react-native') as typeof import('react-native');
    const originalOS = Platform.OS;

    const mockClick = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalRevokeObjectURL = global.URL.revokeObjectURL;

    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Stub document.createElement in the global for the node test environment
    const mockAnchor = { href: '', download: '', click: mockClick };
    const originalDocument = global.document;
    (global as Record<string, unknown>).document = {
      createElement: (tag: string) => (tag === 'a' ? mockAnchor : {}),
    };

    try {
      // Directly set Platform.OS (jest-expo mocks Platform as an object with writable OS)
      (Platform as { OS: string }).OS = 'web';
      await exportFinancesAsCsv(expenses, categories, budgets);

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      (Platform as { OS: string }).OS = originalOS;
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
      (global as Record<string, unknown>).document = originalDocument;
    }
  });
});

describe('exportFinancesAsPdf', () => {
  it('calls Print.printToFileAsync then Sharing.shareAsync', async () => {
    const printSpy = jest
      .spyOn(Print, 'printToFileAsync')
      .mockResolvedValue({ uri: '/tmp/mock.pdf' } as never);
    const shareSpy = jest.spyOn(Sharing, 'shareAsync').mockResolvedValue(undefined);
    await exportFinancesAsPdf(expenses, categories, budgets);
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const [uri, options] = shareSpy.mock.calls[0];
    expect(uri).toContain('.pdf');
    expect(options?.mimeType).toBe('application/pdf');
    printSpy.mockRestore();
    shareSpy.mockRestore();
  });

  it('falls back to categoryId in HTML when category not found', async () => {
    const printSpy = jest
      .spyOn(Print, 'printToFileAsync')
      .mockResolvedValue({ uri: '/tmp/mock.pdf' } as never);
    const shareSpy = jest.spyOn(Sharing, 'shareAsync').mockResolvedValue(undefined);
    const unknownExpenses = [{ id: 'ex', categoryId: 'ghost-exp', amount: 5, date: Date.now() }];
    const unknownBudgets = [{ id: 'bu', categoryId: 'ghost-bud', monthlyLimit: 50, month: '2026-04' }];
    await exportFinancesAsPdf(unknownExpenses, [], unknownBudgets);
    const htmlArg = printSpy.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('ghost-exp');
    expect(htmlArg).toContain('ghost-bud');
    printSpy.mockRestore();
    shareSpy.mockRestore();
  });
});
