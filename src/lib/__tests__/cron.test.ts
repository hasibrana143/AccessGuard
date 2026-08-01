import { describe, it, expect } from 'vitest';
import { parseCron, getNextRun, isValidCron, getNextRunForSchedule } from '@/lib/cron';

describe('cron util', () => {
  // Local-time constructors keep assertions timezone-independent (cron uses server-local time)
  const tue = new Date(2026, 7, 4, 10, 0, 0); // Tuesday 2026-08-04 10:00 local

  it('rejects malformed expressions', () => {
    expect(isValidCron('0 2 * *')).toBe(false);
    expect(isValidCron('60 2 * * *')).toBe(false);
    expect(isValidCron('a b c d e')).toBe(false);
    expect(isValidCron('0 2 * * 8')).toBe(false);
    expect(parseCron('not cron at all')).toBeNull();
  });

  it('accepts valid 5-field expressions', () => {
    expect(isValidCron('0 2 * * 1')).toBe(true);
    expect(isValidCron('*/15 9-17 * * 1-5')).toBe(true);
    expect(isValidCron('0 9 * * MON')).toBe(true);
    expect(isValidCron('0 12 1 * *')).toBe(true);
  });

  it('computes next run for weekly cron (Mon 2am)', () => {
    // 2026-08-04 is Tuesday; next Monday 02:00 is 2026-08-10
    const next = getNextRun('0 2 * * 1', tue);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBe(new Date(2026, 7, 10, 2, 0, 0).getTime());
  });

  it('computes next run for daily cron at fixed time', () => {
    // 10:00 -> next 02:00 is tomorrow
    const next = getNextRun('0 2 * * *', tue);
    expect(next!.getTime()).toBe(new Date(2026, 7, 5, 2, 0, 0).getTime());
  });

  it('computes next run for hourly-ish step cron', () => {
    // 10:00 -> next */15 match is 10:15
    const next = getNextRun('*/15 * * * *', tue);
    expect(next!.getTime()).toBe(new Date(2026, 7, 4, 10, 15, 0).getTime());
  });

  it('computes next run for monthly cron (1st at noon)', () => {
    const next = getNextRun('0 12 1 * *', tue);
    expect(next!.getTime()).toBe(new Date(2026, 8, 1, 12, 0, 0).getTime());
  });

  it('handles Feb 29 leap-year cron', () => {
    const from = new Date(2027, 2, 1, 0, 0, 0); // after a non-leap year
    const next = getNextRun('0 0 29 2 *', from);
    expect(next!.getTime()).toBe(new Date(2028, 1, 29, 0, 0, 0).getTime());
  });

  it('handles day-of-week OR day-of-month semantics', () => {
    // 2026-08-05 is Wednesday; cron matches both Wednesdays and the 15th
    const next = getNextRun('0 9 15 * 3', new Date(2026, 7, 1, 0, 0, 0));
    expect(next!.getTime()).toBe(new Date(2026, 7, 5, 9, 0, 0).getTime()); // Wed Aug 5 < Aug 15
  });

  it('returns null for invalid cron via getNextRun', () => {
    expect(getNextRun('bad', tue)).toBeNull();
  });

  it('getNextRunForSchedule prefers cron over frequency', () => {
    const next = getNextRunForSchedule({ frequency: 'daily', cron: '0 2 * * 1' }, tue);
    expect(next!.getTime()).toBe(new Date(2026, 7, 10, 2, 0, 0).getTime());
    const fallback = getNextRunForSchedule({ frequency: 'daily', cron: '' }, tue);
    expect(fallback!.getTime()).toBe(tue.getTime() + 24 * 60 * 60 * 1000);
  });
});
