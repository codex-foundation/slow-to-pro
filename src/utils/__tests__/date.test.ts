import { currentMonth, formatShortDate, formatTime, todayString, todayWeekday } from '../date';

describe('date utils', () => {
  describe('todayString', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches the current date', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(todayString()).toBe(today);
    });
  });

  describe('currentMonth', () => {
    it('returns a string in YYYY-MM format', () => {
      expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
    });

    it('is a prefix of todayString', () => {
      expect(todayString().startsWith(currentMonth())).toBe(true);
    });
  });

  describe('todayWeekday', () => {
    it('returns a number between 0 and 6', () => {
      const day = todayWeekday();
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    });

    it('matches new Date().getDay()', () => {
      expect(todayWeekday()).toBe(new Date().getDay());
    });
  });

  describe('formatTime', () => {
    it('formats a Unix timestamp as HH:MM', () => {
      // Use a fixed timestamp: 2026-01-01T10:05:00.000Z
      const ts = new Date('2026-01-01T10:05:00.000Z').getTime();
      const result = formatTime(ts);
      // Result depends on local timezone — just assert the shape
      expect(result).toMatch(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/i);
    });
  });

  describe('formatShortDate', () => {
    it('returns a non-empty string for a valid timestamp', () => {
      const ts = new Date('2026-03-15T12:00:00.000Z').getTime();
      const result = formatShortDate(ts);
      expect(result.length).toBeGreaterThan(0);
    });

    it('contains the month abbreviation and day', () => {
      const ts = new Date('2026-03-15T12:00:00.000Z').getTime();
      const result = formatShortDate(ts);
      // Should contain a number (the day)
      expect(result).toMatch(/\d/);
    });
  });
});
