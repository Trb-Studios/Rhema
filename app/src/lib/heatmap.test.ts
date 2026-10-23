import { describe, expect, it } from 'vitest';
import { grid, longestRun, monthLabels, tally } from './heatmap';

describe('grid', () => {
  it('is rectangular however the dates fall', () => {
    const weeks = grid([], 15, '2026-06-17');
    expect(weeks).toHaveLength(15);
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  it('ends with the week today falls in', () => {
    // 2026-06-17 is a Wednesday, so its week runs Sunday the 14th to Saturday the 20th.
    const weeks = grid([], 3, '2026-06-17');
    const last = weeks[weeks.length - 1];
    expect(last[0].date).toBe('2026-06-14');
    expect(last[6].date).toBe('2026-06-20');
  });

  it('runs oldest week first', () => {
    const weeks = grid([], 4, '2026-06-17');
    expect(weeks[0][0].date < weeks[3][0].date).toBe(true);
  });

  it('marks the days that were read', () => {
    const weeks = grid(['2026-06-15', '2026-06-16'], 2, '2026-06-17');
    const cells = weeks.flat();
    expect(cells.find((cell) => cell.date === '2026-06-15')?.read).toBe(true);
    expect(cells.find((cell) => cell.date === '2026-06-17')?.read).toBe(false);
  });

  it('calls later days ahead, not missed', () => {
    const weeks = grid([], 1, '2026-06-17');
    const cells = weeks.flat();
    expect(cells.find((cell) => cell.date === '2026-06-16')?.ahead).toBe(false);
    expect(cells.find((cell) => cell.date === '2026-06-17')?.ahead).toBe(false);
    expect(cells.find((cell) => cell.date === '2026-06-18')?.ahead).toBe(true);
  });

  it('ignores a day outside the window', () => {
    const weeks = grid(['2020-01-01'], 2, '2026-06-17');
    expect(weeks.flat().some((cell) => cell.read)).toBe(false);
  });
});

describe('tally', () => {
  it('counts only the days that have happened', () => {
    const weeks = grid(['2026-06-15', '2026-06-16'], 1, '2026-06-17');
    // Sunday the 14th through Wednesday the 17th is four days available.
    expect(tally(weeks)).toEqual({ read: 2, possible: 4 });
  });

  it('is empty for a week not yet begun', () => {
    const weeks = grid([], 1, '2026-06-14');
    expect(tally(weeks)).toEqual({ read: 0, possible: 1 });
  });
});

describe('monthLabels', () => {
  it('names each month once', () => {
    const labels = monthLabels(grid([], 15, '2026-06-17'));
    expect(new Set(labels.map((l) => l.label)).size).toBe(labels.length);
  });

  it('places every label inside the grid', () => {
    const weeks = grid([], 15, '2026-06-17');
    for (const label of monthLabels(weeks)) {
      expect(label.index).toBeGreaterThanOrEqual(0);
      expect(label.index).toBeLessThan(weeks.length);
    }
  });
});

describe('longestRun', () => {
  it('is zero when nothing has been read', () => {
    expect(longestRun([])).toBe(0);
  });

  it('counts a run of consecutive days', () => {
    expect(longestRun(['2026-06-01', '2026-06-02', '2026-06-03'])).toBe(3);
  });

  it('breaks the run on a missed day', () => {
    expect(longestRun(['2026-06-01', '2026-06-02', '2026-06-04'])).toBe(2);
  });

  it('finds the longest of several runs', () => {
    expect(longestRun(['2026-06-01', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-09'])).toBe(
      3,
    );
  });

  it('counts a day recorded twice once', () => {
    expect(longestRun(['2026-06-01', '2026-06-01', '2026-06-02'])).toBe(2);
  });

  it('runs across the end of a month', () => {
    expect(longestRun(['2026-05-30', '2026-05-31', '2026-06-01'])).toBe(3);
  });

  it('runs across the end of a year', () => {
    expect(longestRun(['2026-12-31', '2027-01-01'])).toBe(2);
  });
});
