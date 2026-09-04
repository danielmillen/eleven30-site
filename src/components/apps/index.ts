import LaunchWindowBody from './LaunchWindowBody.astro';
import RachelsTipCalculatorBody from './RachelsTipCalculatorBody.astro';

// Local alias — Astro doesn't export a stable public type for "a .astro component reference".
export type AppBodyComponent = (...args: any[]) => any;

/**
 * Per-app marketing body, keyed by content-collection slug (`app.id`).
 * A slug with no entry renders the shared `[app].astro` shell alone, which
 * keeps "adding an app" a content change rather than a code change.
 */
export const APP_BODIES: Record<string, AppBodyComponent | undefined> = {
  'launch-window': LaunchWindowBody,
  'rachels-tip-calculator': RachelsTipCalculatorBody,
};
