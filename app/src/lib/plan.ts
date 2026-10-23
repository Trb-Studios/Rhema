/**
 * The reading plan maths.
 *
 * Scheduling is by words rather than chapters, because chapters are wildly uneven:
 * Psalm 117 is 2 verses and Psalm 119 is 176. Two chapters a day means something very
 * different in each. Word counts come from the text actually loaded, so they match the
 * translation being read rather than a figure quoted from somewhere else.
 */

export type PlanInput = {
  /** Either a deadline in days, or an amount of time per day. */
  mode: 'days' | 'minutes';
  value: number;
  /** Reading speed. 200 words a minute is an unhurried average for prose. */
  wordsPerMinute: number;
  totalWords: number;
  totalChapters: number;
};

export type Plan = {
  days: number;
  chaptersPerDay: number;
  minutesPerDay: number;
  chaptersPerHour: number;
  chaptersPerWeek: number;
  chaptersPerYear: number;
  minutesPerChapter: number;
  finishesOn: Date;
  totalHours: number;
};

export const PRESETS = [
  { label: '90 days', mode: 'days' as const, value: 90 },
  { label: '6 months', mode: 'days' as const, value: 182 },
  { label: '1 year', mode: 'days' as const, value: 365 },
  { label: '2 years', mode: 'days' as const, value: 730 },
  { label: '15 min a day', mode: 'minutes' as const, value: 15 },
  { label: '30 min a day', mode: 'minutes' as const, value: 30 },
  { label: '1 hour a day', mode: 'minutes' as const, value: 60 },
];

export function calculate(input: PlanInput, from = new Date()): Plan {
  const wpm = Math.max(50, input.wordsPerMinute);
  const value = Math.max(1, input.value);
  const totalMinutes = input.totalWords / wpm;

  // Either the deadline sets the daily time, or the daily time sets the deadline.
  const days = input.mode === 'days' ? value : totalMinutes / value;

  const finishesOn = new Date(from);
  finishesOn.setDate(finishesOn.getDate() + Math.ceil(days));

  const minutesPerChapter = totalMinutes / input.totalChapters;
  const chaptersPerDay = input.totalChapters / days;

  return {
    days,
    chaptersPerDay,
    minutesPerDay: totalMinutes / days,
    chaptersPerHour: 60 / minutesPerChapter,
    chaptersPerWeek: chaptersPerDay * 7,
    chaptersPerYear: Math.min(chaptersPerDay * 365, input.totalChapters),
    minutesPerChapter,
    finishesOn,
    totalHours: totalMinutes / 60,
  };
}

/** Rounds for display without pretending to a precision the estimate does not have. */
export function show(value: number, places = 1): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: places });
}
