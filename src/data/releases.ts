export interface Release {
  date: string;
  app: string;
  version: string;
  upcoming?: boolean;
  items: readonly string[];
}

export const releases: readonly Release[] = [
  {
    date: "Coming soon",
    app: "Rachel's Tip Calculator",
    version: "v2.0",
    upcoming: true,
    items: [
      "Redesigned split-the-check flow",
      "Faster entry with a larger keypad",
      "A proper iPad layout",
      "Round-the-total presets you can set once",
    ],
  },
  {
    date: "28 Aug 2026",
    app: "Launch Window",
    version: "Beta 0.4",
    items: [
      "Home screen widget",
      "Notification before the window opens",
      "Offline schedule cache",
    ],
  },
  {
    date: "14 May 2026",
    app: "Rachel's Tip Calculator",
    version: "v1.4",
    items: [
      "Fixed rounding on very small checks",
      "Dark mode contrast fixes",
    ],
  },
  {
    date: "09 Jan 2026",
    app: "Rachel's Tip Calculator",
    version: "v1.0",
    items: [
      "First release on the App Store",
    ],
  },
];
