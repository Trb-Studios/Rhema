/**
 * The year of reading, as a grid.
 *
 * A streak says how many days in a row; it says nothing about the shape of the habit.
 * A grid of days shows the weeks that went well, the fortnight away, and whether the
 * gaps are getting shorter — which is the thing a reader can actually act on.
 *
 * Laid out the way a calendar is: a column per week, a row per weekday, oldest week on
 * the left. Days after today are kept in the grid rather than dropped, so the current
 * week does not change width as it fills.
 */

import { addDays, isoDate, startOf, today } from './dates';

export type Cell = {
  date: string;
  read: boolean;
  /** Later than today: drawn as an empty slot, not a missed day. */
  ahead: boolean;
};

export type Week = Cell[];

/** Sunday-first, matching the weekday labels beside the grid. */
function sundayOf(iso: string): string {
  const date = startOf(iso);
  return addDays(iso, -date.getDay());
}

/**
 * The last `weeks` weeks ending with the week `at` falls in.
 *
 * Every week is seven cells, so the grid is rectangular however the dates fall.
 */
export function grid(days: Iterable<string>, weeks = 15, at: string = today()): Week[] {
  const read = new Set(days);
  const firstSunday = addDays(sundayOf(at), -(weeks - 1) * 7);

  const out: Week[] = [];
  for (let week = 0; week < weeks; week++) {
    const cells: Week = [];
    for (let day = 0; day < 7; day++) {
      const date = addDays(firstSunday, week * 7 + day);
      cells.push({ date, read: read.has(date), ahead: date > at });
    }
    out.push(cells);
  }
  return out;
}

/** How many of the days in the grid were read, and how many were available to read. */
export function tally(weeks: Week[]): { read: number; possible: number } {
  let read = 0;
  let possible = 0;
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.ahead) continue;
      possible += 1;
      if (cell.read) read += 1;
    }
  }
  return { read, possible };
}

/** The month names to print above the grid, each over the week it starts in. */
export function monthLabels(weeks: Week[]): Array<{ index: number; label: string }> {
  const labels: Array<{ index: number; label: string }> = [];
  let last = '';
  weeks.forEach((week, index) => {
    const month = startOf(week[0].date).toLocaleDateString(undefined, { month: 'short' });
    // Only once the week is mostly in the new month, so the label sits over its own weeks.
    const fourth = startOf(week[3].date).toLocaleDateString(undefined, { month: 'short' });
    if (fourth !== last && month === fourth) {
      labels.push({ index, label: fourth });
      last = fourth;
    }
  });
  return labels;
}

/** The longest run of consecutive days read within the grid, for the line beneath it. */
export function longestRun(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous = '';
  for (const day of sorted) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

/** Today's cell, so the grid can ring it. */
export function isToday(cell: Cell, at: string = today()): boolean {
  return cell.date === at;
}

export { isoDate };
