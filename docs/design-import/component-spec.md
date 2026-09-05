# Eleven30 design-system components — visual spec

Extracted from the compiled design-system bundle (`_ds_bundle.js`, React source).
This site is static Astro + Tailwind, not React, so these are **not** to be ported
as literal components — translate each into an Astro component (or a Tailwind
utility recipe) that reads the same CSS custom properties from `tokens/*.css`.
All measurements below are the source of truth for that translation.

Icons throughout are Tabler Icons via webfont: `<i class="ti ti-{name}"></i>`,
loaded from `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css`
(self-host before production per the design system's own "known gaps" note).

## Button

- Sizes: `sm` (height `--control-h-sm`, padding `0 14px`, font `--text-label`),
  `md` (height `--control-h-md`, padding `0 18px`, font `--text-label`),
  `lg` (height `--control-h-lg`, padding `0 22px`, font `--text-body`).
- Variants:
  - `primary` (default): bg `--bg-accent`, fg `--text-on-accent`, no border. Hover → `--accent-hover`, press → `--accent-press`.
  - `secondary`: bg `--bg-surface`, fg `--text-primary`, border `--border-strong`. Hover bg → `--ink-050`, press → `--ink-100`.
  - `ghost`: bg transparent, fg `--text-primary`, border transparent. Hover bg → `--ink-050`, press → `--ink-100`.
  - `critical`: bg `--clay-600`, fg `--paper`. Hover → `--clay-500`, press → `--clay-700`.
- Shape: `border-radius: var(--radius-md)`, inline-flex, centered content, `gap: var(--space-3)`, `font-weight: var(--weight-medium)`, `letter-spacing: -0.004em`, `white-space: nowrap` label.
- Disabled/loading: bg `--bg-sunken`, fg `--text-disabled`, border transparent, `cursor: not-allowed`.
- Press interaction: `transform: scale(var(--press-scale))` (0.985) for 90ms.
- `fullWidth` sets `width: 100%`.

## Card

- `padding`: `none` 0, `sm` `--space-5` (16px), `md` `--space-6` (20px, default), `lg` `--space-7` (24px).
- `tone`:
  - `default`: bg `--bg-surface`, border `--border-hairline`.
  - `subtle`: bg `--bg-sunken`, border `--border-hairline`, no shadow.
  - `accent`: bg `--bg-accent-subtle`, border `--accent-200`.
  - `bold`: bg `--bg-accent-bold`, no border, text → `--text-on-accent`.
  - `deep`: bg `--bg-accent-deep`, no border, text → `--text-on-ground`.
  - `inverse`: bg `--bg-inverse`, no border, text → `--text-inverse`.
- Shape: `border-radius: var(--radius-lg)` (14px), `display: flex; flex-direction: column; gap: var(--space-4)`, `box-shadow: var(--shadow-sm)` (none for `subtle`).
- Interactive cards (`interactive`, used for clickable app/post cards): render as a `<button>`-like element; on hover, border → `--border-strong`, shadow → `--shadow-md`. No lift/translate.

## Badge

- Pill: `height: 24px`, `padding: 0 var(--space-3)`, `border-radius: var(--radius-full)`, `display: inline-flex; align-items: center; gap: var(--space-2)`.
- Text: `font-family: var(--font-data)`, `font-size: var(--text-micro)`, `letter-spacing: var(--ls-micro)`, `text-transform: uppercase`, `font-weight: 500`.
- Tones: `neutral` (bg `--ink-100`, fg `--text-secondary`), `accent` (bg `--bg-accent-subtle`, fg `--text-accent`), `safe` (bg `--green-100`, fg `--green-800`), `tight` (bg `--amber-100`, fg `--amber-800`), `over` (bg `--clay-100`, fg `--clay-800`), `info` (bg `--slate-100`, fg `--slate-800`), `bold` (bg `--bg-accent-bold`, fg `--text-on-accent`).
- In the canvas, statuses map roughly: "On the App Store" → `safe`, "In development" → `info`, "Name not final" → `info`, "Coming soon" → `info`.

## Input (text field)

- Wrapper: `display: flex; flex-direction: column; gap: var(--space-2)`.
- Optional `label` above: `font-size: var(--text-label)`, `font-weight: var(--weight-medium)`, `color: var(--text-primary)`.
- Field box: `height: var(--control-h-md)` (44px), `padding: 0 var(--space-4)`, `border-radius: var(--radius-md)`, `background: var(--bg-surface)` (`--bg-sunken` when disabled), `border: 1px solid var(--border-hairline)`. Focus → border `--border-focus` + `box-shadow: var(--ring-focus)`. Invalid/error → border `--clay-600`.
- Input text: `font-size: var(--text-body)`, no inner border/outline.
- Optional hint/error line below: `font-size: var(--text-caption)`, color `--text-tertiary` (or `--text-critical` when invalid).
- The site's contact form needs a **multi-line message** field — the source Input is single-line; implement a `Textarea` following the same field-box visual rules (border, focus ring, radius, label/hint pattern) with `min-height` around 120–160px and `padding: var(--space-3) var(--space-4)`.

## Select

- Same field-box chrome as Input (height, radius, border, focus ring).
- Native `<select>` with `appearance: none`, right-aligned `chevron-down` icon (20px, `--icon-muted`) positioned absolutely, `padding-right` reserved for it.

## Wordmark / Monogram (brand)

- Wordmark: "Eleven" (weight 400 at ≥18px, else 500) + "30" (weight 700 at ≥18px, else 800) in `--font-display`, `letter-spacing: -0.028em` (`-0.016em` when small), tight `gap` between words (7px / 5px small). The "30" is colored — `--text-accent` normally, `--accent-300` on a light-on-dark (`tone="light"`) placement; text overall is `--text-primary` (or `--paper` for `tone="light"`).
- Monogram (icon-only "30", used for the favicon/header mark): a square/squircle (`border-radius` ≈ `0.24 × size`) filled `--bg-accent` with `--text-on-accent` "30" glyph at `0.62 × size`, weight 800, `-0.03em`.
- Header lockup in the canvas: Monogram (28px) + Wordmark (20px) side by side, as a single "go home" button.
- Footer lockup: Wordmark at 22px, `tone="light"` (on the dark `--bg-inverse` footer).

## Global structure notes from the canvas

- Page shell: `data-accent="teal"` and `data-theme="light"` on the root wrapper — the personal/company site uses the **teal (slate)** accent, not the house evergreen, background `--paper`, text `--text-primary`, `font-family: var(--font-body)`.
- Sticky header: 64px tall, `position: sticky; top: 0`, translucent blurred background (`color-mix(in srgb, var(--paper) 88%, transparent)` + `backdrop-filter: blur(12px)`), bottom hairline border, max-width 1200px inner row.
- Nav active-state underline: a 2px `--bg-accent` bar under the active nav label.
- Section rhythm: alternating full-bleed bands — plain `--paper`, `--bg-sunken` (with top/bottom hairlines), `--bg-accent-deep` (dark, `--text-on-ground`), `--bg-accent-bold` (for the consulting CTA band) — each with `max-width: 1200px` centered inner content and generous vertical padding (72–96px sections, tighter on narrower single-column pages like blog/post/privacy which cap at 720–1000px).
- Footer: `--bg-inverse` background, `--text-inverse` text, 4-column grid (wordmark+blurb, then 3 link columns), bottom bar with copyright + domain.
- Screenshots/photos are unavailable — the canvas renders them as dashed-border placeholder boxes (`border: 1px dashed var(--border-strong); background: var(--bg-sunken)`) with a caption giving the intended pixel dimensions. Keep this placeholder treatment in the built site until real assets exist.
