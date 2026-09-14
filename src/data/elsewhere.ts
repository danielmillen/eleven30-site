export interface ElsewhereLink {
  icon: string;
  label: string;
  href?: string;
}

export const elsewhere: readonly ElsewhereLink[] = [
  { icon: "mail", label: "hello@eleven30.xyz", href: "mailto:hello@eleven30.xyz" },
  { icon: "brand-github", label: "github.com/danielmillen", href: "https://github.com/danielmillen" },
  { icon: "map-pin", label: "Florida, United States" },
];
