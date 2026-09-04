export interface Service {
  icon: string;
  title: string;
  body: string;
}

export const services: readonly Service[] = [
  { icon: "device-mobile", title: "Mobile and web builds", body: "From a rough idea to something in a store. Design and implementation by the same pair of hands." },
  { icon: "ruler-2", title: "Design systems", body: "Tokens, components and the documentation that keeps a small team from drifting apart." },
  { icon: "message-circle", title: "A second opinion", body: "A short engagement to review what you have and tell you plainly where the risk is." },
];
