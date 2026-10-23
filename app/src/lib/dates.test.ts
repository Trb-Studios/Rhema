import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isoDate, startOf } from './dates';

describe('dates', () => {
  it('reads the local calendar, not UTC', () => {
    // Late evening in the Americas is already tomorrow in UTC. toISOString would credit
    // this evening's reading to tomorrow; the local date must not.
    const evening = new Date(2026, 2, 14, 23, 30);
    expect(isoDate(evening)).toBe('2026-03-14');
    expect(evening.toISOString().slice(0, 10) === '2026-03-14').toBe(
      evening.getTimezoneOffset() <= 30,
    );
  });

  it('pads single digits', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('crosses months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('counts a day that crosses a clock change as one day', () => {
    // The US spring change in 2026 is 8 March, so that local day is 23 hours long.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('counts backwards and to itself', () => {
    expect(daysBetween('2026-05-10', '2026-05-10')).toBe(0);
    expect(daysBetween('2026-05-10', '2026-05-03')).toBe(-7);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('starts a day at local midnight', () => {
    const start = startOf('2026-06-15');
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(15);
  });
});
