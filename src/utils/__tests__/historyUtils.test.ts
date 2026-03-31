import {
  prevMonth,
  nextMonth,
  monthLabel,
  availableMonths,
} from '../historyUtils';

describe('prevMonth', () => {
  it('goes back one month within the same year', () => {
    expect(prevMonth('2026-03')).toBe('2026-02');
  });

  it('wraps back to December of the previous year', () => {
    expect(prevMonth('2026-01')).toBe('2025-12');
  });
});

describe('nextMonth', () => {
  it('advances one month within the same year', () => {
    expect(nextMonth('2026-02')).toBe('2026-03');
  });

  it('wraps forward to January of the next year', () => {
    expect(nextMonth('2025-12')).toBe('2026-01');
  });
});

describe('monthLabel', () => {
  it('formats YYYY-MM as "Month YYYY"', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
  });

  it('formats January correctly', () => {
    expect(monthLabel('2025-01')).toBe('January 2025');
  });
});

describe('availableMonths', () => {
  it('returns empty array when there are no expenses', () => {
    expect(availableMonths([])).toEqual([]);
  });

  it('returns unique months sorted newest-first', () => {
    const expenses = [
      { id: 'e1', categoryId: 'c1', amount: 10, date: new Date('2026-03-15').getTime() },
      { id: 'e2', categoryId: 'c1', amount: 20, date: new Date('2026-01-05').getTime() },
      { id: 'e3', categoryId: 'c1', amount: 5,  date: new Date('2026-03-01').getTime() },
    ];
    expect(availableMonths(expenses)).toEqual(['2026-03', '2026-01']);
  });
});
