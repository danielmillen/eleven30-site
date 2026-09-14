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
      "New app icon and a complete visual face-lift",
      "Rewritten from the ground up",
      "Choose any tip percentage, not just the presets",
      "Add a discount, by amount or percent, before tipping",
    ],
  },
  {
    date: "18 Jul 2023",
    app: "Rachel's Tip Calculator",
    version: "v1.1",
    items: [
      "New app icon",
      "Preferences now persist across sessions",
    ],
  },
  {
    date: "13 Jul 2023",
    app: "Rachel's Tip Calculator",
    version: "v1.0",
    items: [
      "First release on the App Store",
    ],
  },
];
