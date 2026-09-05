export interface Faq {
  q: string;
  a: string;
}

export const faqs: readonly Faq[] = [
  { q: "How do I get help with an app?", a: "Email hello@eleven30.xyz or use the form here. Tell me which app and what you were doing when it went wrong." },
  { q: "Do I need an account to use your apps?", a: "No. Neither app requires an account, and neither one asks for your name." },
  { q: "Why does the launch app want my location?", a: "Only to sort launch sites by how close they are and to work out visibility. You can decline and pick a site by hand." },
  { q: "A countdown looked wrong. What happened?", a: "The launch window almost certainly moved — schedules change constantly. Pull to refresh, and email me if it still looks off." },
  { q: "When is v2 of the tip calculator out?", a: "Soon. The release notes page is where it'll show up first." },
  { q: "How do I request a feature?", a: "Same address. I read every one, and I'm honest when the answer is no." },
];
