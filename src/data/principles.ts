export interface Principle {
  icon: string;
  title: string;
  body: string;
}

export const principles: readonly Principle[] = [
  { icon: "circle-check", title: "Finish things", body: "I'd rather ship four screens that are right than twelve that are nearly right." },
  { icon: "eye", title: "Build in the open", body: "Decisions, mistakes and reversals go on the blog while they're still uncomfortable." },
  { icon: "shield-check", title: "Ask for less", body: "Every permission and every field has to earn itself. Most don't." },
];
