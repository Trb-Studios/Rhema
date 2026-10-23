/**
 * The reader's own plan.
 *
 * Shared, because the plan screen sets the pace and the reader shows what is left of
 * today against it.
 */

import { useCallback } from 'react';
import { createStore, useStore } from './store';
import { PLAN_DEFAULTS } from './schedule';
import type { PlanSettings } from './schedule';

const store = createStore<PlanSettings | null>('rhema.plan', null);

export function usePlanSettings() {
  const [stored, setStored] = useStore(store);

  /** A plan only exists once one is started, so the screen can offer to start one. */
  const settings: PlanSettings = { ...PLAN_DEFAULTS, ...(stored ?? {}) };

  const start = useCallback(
    (over: Partial<PlanSettings> = {}) => {
      setStored({ ...PLAN_DEFAULTS, ...over });
    },
    [setStored],
  );

  const update = useCallback(
    <K extends keyof PlanSettings>(key: K, value: PlanSettings[K]) => {
      setStored((current) => ({ ...PLAN_DEFAULTS, ...(current ?? {}), [key]: value }));
    },
    [setStored],
  );

  const stop = useCallback(() => setStored(null), [setStored]);

  return { settings, started: stored !== null, start, update, stop };
}
