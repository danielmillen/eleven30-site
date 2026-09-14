export interface NowItem {
  icon: string;
  text: string;
}

export const nowItems: readonly NowItem[] = [
  { icon: "rocket", text: "Building the launch countdown app — beta coming soon." },
  { icon: "receipt", text: "Finishing v2 of the tip calculator." },
  { icon: "pencil", text: "Writing one post a fortnight about the build." },
  { icon: "users", text: "Room for one consulting project in Q1." },
];

export interface NowLongItem {
  label: string;
  text: string;
}

export const nowLong: readonly NowLongItem[] = [
  { label: "Building", text: "The launch countdown app — widget and notifications are the last big pieces before a public beta. Coming soon." },
  { label: "Shipping", text: "v2 of Rachel's Tip Calculator: rewritten from the ground up, with a new icon and face-lift, any tip percentage instead of just the presets, and a discount you can add before tipping." },
  { label: "Writing", text: "One post a fortnight, usually about a decision I nearly got wrong." },
  { label: "Consulting", text: "One project at a time. Q1 is open." },
  { label: "Reading", text: "Whatever's on the desk. Ask me and I'll tell you." },
];

export const nowUpdated: string = "13 Sep 2026";
