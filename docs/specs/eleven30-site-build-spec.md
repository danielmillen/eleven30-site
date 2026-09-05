# Eleven30 personal site build: Design

**Ticket:** None — greenfield build driven by [`docs/site-build-brief.md`](../site-build-brief.md) and the imported design in [`docs/design-import/`](../design-import/)

**Status:** Accepted

**Design source:** [`docs/design-import/eleven30-site.dc.html`](../design-import/eleven30-site.dc.html) — one canvas flattening twelve page states (home `59–165`, apps index `168–198`, launch app `201–306`, tip app `309–357`, blog index `360–381`, post `384–415`, about `418–470`, now `473–487`, consulting `490–520`, support `523–562`, changelog `565–594`, privacy `597–620`, plus header `35–54` and footer `624–646`); all real copy lives in the `<script type="text/x-dc">` block at `651–885`. Component measurements come from [`component-spec.md`](../design-import/component-spec.md); raw tokens from [`tokens/*.css`](../design-import/tokens/).

---

## Goal

The repository is an untouched `npm create astro@latest --template minimal` scaffold: `astro.config.mjs` is an empty `defineConfig({})`, `src/pages/index.astro` is the stock "Astro" placeholder, `package.json` pins only `astro@^7.3.1`, and there is no `src/content/`, no `src/components/`, no `src/styles/`, no adapter, no Tailwind, no `wrangler.jsonc`. Everything the brief describes — three content collections, eleven routes plus a feed and an API endpoint, a design-token port, one React island — does not exist yet. This design specifies the whole build: how the design system's CSS custom properties become a Tailwind 4 theme without losing the runtime `[data-accent]` cascade they depend on, how the `apps` and `policies` collections cross-reference each other so a missing policy is a build failure rather than a store-compliance incident, how the four canvas-only pages sit alongside the collection-backed ones, and how the one dynamic route reads Workers secrets.

The brief's §0 warning is not boilerplate and it changes real code. Astro 7 ships Vite 8, a Rust compiler that rejects unclosed tags, Sätteri instead of remark/rehype as the Markdown processor, and `compressHTML: 'jsx'` whitespace handling ([v7 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v7/)); Astro 6 moved to Zod 4, deprecated `z` from `astro:content` in favour of `astro/zod`, removed legacy content collections outright, and — for this project specifically — removed `Astro.locals.runtime` in `@astrojs/cloudflare` v13+ and dropped Cloudflare Pages support entirely. The brief's §4 code sample is v5-era on three counts (`z` import, `z.string().url()`, and nothing else about it survives review unchanged). Every API shape below was checked against current documentation, and the checks are recorded under [Verified facts](#verified-facts) so an implementer does not repeat them.

This design deliberately stops short of a few things the canvas implies: no dark mode (the tokens are ready, nothing toggles them), no real screenshots or app icons (the dashed placeholder treatment stays), no Open Graph images, no CSP, and no content collection for the four static pages. Each exclusion is reasoned in [Scope: Out](#out).

---

## Decisions taken before this spec

Resolved by the author in [`DECISIONS.md`](../design-import/DECISIONS.md) and in the build request. They are not re-argued anywhere below; the design assumes them.

1. **Privacy is per-app, not combined.** The canvas's single `/privacy/` page (`597–620`) is discarded as a route. Its narrative is split by what actually applies to each app, into two independently authored files under `src/content/policies/`. No `/privacy/` route is created. (DECISIONS §1; brief §4, §5, §10.)
2. **`dataCollected` and `thirdParties` stay empty.** Agents must not infer store privacy labels. Both policy files ship `dataCollected: []` and `thirdParties: []`, and this is flagged to the author, not silently filled. (brief §10 open decision 1.)
3. **The app is "Launch Window" (`launch-window`) everywhere**, but the name is genuinely unsettled, so the canvas's `Name not final` badge (`211`) is preserved on that app's own page. (DECISIONS §2.)
4. **One seed blog post only** — `src/content/blog/my-first-post.md`, adapted from the canvas's first sample post. The other four `POSTS` entries (`685–697`) are not published. (DECISIONS §4.)
5. **Support merges into `/contact/`.** No `/support/` route. The canvas's FAQ list and contact-info card wrap the brief's real form. (DECISIONS §3.)
6. **`/about/`, `/now/`, `/consulting/`, `/changelog/` are built** as plain Astro pages with no content collection. (DECISIONS §3.)
7. **Identity placeholders stay placeholders.** `[Your name]`, `github.com/[handle]`, and every photo box remain visibly unfilled. (DECISIONS, content-mapping section.)
8. **Accent is teal, not the house evergreen** — `data-accent="teal"` at the document root. (DECISIONS, content-mapping section.)

---

## Scope

### In

- Astro 7 project configuration: `trailingSlash: 'always'`, `output: 'static'`, `@astrojs/cloudflare` adapter, `site`, `session: false`, `prerenderConflictBehavior: 'error'`, `@astrojs/sitemap`, `@astrojs/react`, `@tailwindcss/vite`, and the stable `fonts` config for self-hosted Instrument Sans / Instrument Serif / IBM Plex Mono.
- The design-token port: token CSS imported verbatim into `src/styles/`, plus a `@theme inline` layer that turns the semantic aliases into Tailwind utilities without collapsing the `[data-accent]` / `[data-theme]` indirection.
- Astro components for the six design-system primitives in `component-spec.md` (Button, Card, Badge, Input/Textarea, Select, Wordmark/Monogram) plus an inline-SVG `Icon`, page shell, header, footer, and the recurring canvas patterns (section bands, feature cards, placeholder media, list rows).
- Three content collections with the brief's exact field lists, ported to the Astro 7 / Zod 4 API, and a build-time invariant module that fails the build in both directions (app without policy, policy without app).
- Every route in brief §5 plus `/about/`, `/now/`, `/consulting/`, `/changelog/`, `/404`, `robots.txt` and the sitemap.
- The contact island (`client:load`, the only client directive on the site) and `POST /api/contact` implementing brief §6's sequence exactly, reading secrets from `cloudflare:workers`.
- `wrangler.jsonc`, `.nvmrc`, and a post-build route-verification script that gives brief §9's checklist teeth.

### Out

- **Dark mode** — `tokens/dark.css` is not imported. Nothing in the canvas toggles `data-theme`, and shipping ~60 unused custom properties plus the `[data-theme="dark"] [data-accent]` correction block (colors.css `292–308`) buys nothing today. The file stays in `docs/design-import/` so adding a toggle later is an import plus a button.
- **`tokens/category.css`** — the `--cat-*` scale exists for payee colours in the budgeting product, explicitly "never for UI" (category.css `2`). Nothing on this site is a category chip.
- **Real screenshots, app icons, portrait, and OG images** — no assets exist. The canvas already renders them as dashed placeholder boxes with intended pixel dimensions, and `component-spec.md:76` says keep that treatment until real assets exist. `og:image` is omitted rather than pointed at a 404; see [Assumptions and deferred work](#assumptions-and-deferred-work) item 4.
- **MDX** — brief §2 permits `@astrojs/mdx` "only if a post actually needs components inline". The one seed post does not. Adding it later is a dependency plus one line, and skipping it keeps the `glob` pattern to `**/*.md`.
- **Rate limiting on `/api/contact`** — the only durable counter available on Workers is KV or D1, both forbidden by brief §8. Turnstile plus the honeypot is the whole spam story.
- **A content collection for About / Now / Consulting / Changelog** — per decision 6. These are one-of-a-kind pages, not repeated items; a collection would add a schema, a loader and a markdown round-trip for a single entry each.
- **Analytics, chat widgets, embeds** — brief §8. The Turnstile script is the site's only third-party request and it is required by brief §6; Cloudflare's docs state `api.js` must be loaded from its exact URL and may not be proxied or cached.
- **`astro:env` for the three secrets** — see [Secrets and environment](#secrets-and-environment); it would couple `npm run build` to secret presence in an environment where the secrets do not exist.

---

## Stack and pinned versions

Resolved against the npm registry on 2026-09-03. `package.json` currently pins `astro: ^7.3.1`, and `package-lock.json` already resolves `astro@7.3.1`, `vite@8.2.2`, `zod@4.5.4` (transitively, via Astro).

| Package | Version | Role / why |
|---|---|---|
| `astro` | 7.3.1 | Already pinned. Vite 8, Rust compiler, Sätteri Markdown. |
| `@astrojs/cloudflare` | 14.3.0 | Adapter. Peer-requires `astro ^7.2.0` and `wrangler ^4.125.0` — it is the only adapter version compatible with the pinned Astro. |
| `wrangler` | 4.129.0 | Peer of the adapter; also the CLI for `wrangler secret put`. |
| `@astrojs/react` | 6.0.5 | Depends on `vite ^8.0.13`, matching Astro 7's Vite 8. React 19.2.x. |
| `react` / `react-dom` | 19.2.8 | One island. |
| `@tailwindcss/vite` + `tailwindcss` | 4.3.3 | CSS-first config. Astro wires Tailwind 4 through the Vite plugin, **not** an integration — `@astrojs/tailwind` is Tailwind 3 legacy only ([styling guide](https://docs.astro.build/en/guides/styling/)). Install via `npx astro add tailwind`. |
| `@astrojs/sitemap` | 3.7.4 | Emits `sitemap-index.xml` + `sitemap-0.xml`. |
| `@astrojs/rss` | 4.0.19 | `rss()` helper in `src/pages/rss.xml.ts`. |
| `@tabler/icons` | 3.46.0 (MIT) | **devDependency.** Source SVGs only — see [Icons](#icons). |
| `@astrojs/check` + `typescript` | latest | `astro check` in the build script; `tsconfig.json` already extends `astro/tsconfigs/strict`. |

**Not installed, deliberately:** `@astrojs/mdx` (nothing needs it), `resend` (its published peer dependency is `@react-email/render`, which drags React rendering into the Worker bundle for what brief §2 calls "a single API call" — the endpoint uses `fetch` against the documented REST API instead), `zod` as a direct dependency (`astro/zod` is a re-export of the exact version Astro uses; the v6 upgrade guide recommends importing from there), `@tabler/icons-webfont` (see [Icons](#icons)), and anything on brief §8's forbidden list.

Node is pinned twice: `package.json` already declares `engines.node >= 22.12.0`; add `.nvmrc` containing `22.12.0` and match it in the Workers Builds settings per brief §7.

---

## Astro 7 deltas that invalidate the brief's sample code

The brief says its §4 scaffolding "was written against the Astro 5 API and has not been verified". These are the specific corrections; the field lists themselves are unchanged.

1. **`z` no longer comes from `astro:content`.** Astro 6 deprecated both `astro:schema` and the `z` re-export in favour of `astro/zod`. Use `import { defineCollection } from 'astro:content'` + `import { z } from 'astro/zod'`.
2. **Zod 4 moved string formats to the top-level namespace.** `z.string().url()` → `z.url()`. This affects `apps.appStoreUrl`, `apps.playStoreUrl`, `policies.thirdParties[].policyUrl`, and the contact endpoint's email field (`z.string().email()` → `z.email()`).
3. **`entry.id` is the slug; `entry.slug` and `entry.render()` are gone.** Route params come from `post.id`; rendering is `const { Content } = await render(entry)` with `render` imported from `astro:content`.
4. **`getStaticPaths()` params must be strings**, never numbers (Astro 6). Nothing here uses numeric params, but `order` must not leak into one.
5. **`Astro.locals.runtime` is gone** (`@astrojs/cloudflare` v13+). Environment access is `import { env } from 'cloudflare:workers'`; execution context is `Astro.locals.cfContext`.
6. **`wrangler.jsonc`'s `main` points at the adapter entrypoint**, `"@astrojs/cloudflare/entrypoints/server"`, not at a built worker file.
7. **Endpoints with a file extension can never be served with a trailing slash** (Astro 6), regardless of `trailingSlash: 'always'`. Every link to the feed must be `/rss.xml`, never `/rss.xml/`.
8. **`compressHTML` defaults to `'jsx'`** in Astro 7, which strips whitespace between inline elements. Anywhere the canvas relies on a literal space between inline spans — the `platform · price` metadata rows (canvas `98–100`, `188–190`) and the post meta row (`387–389`) — either render the separator as its own element with a flex `gap` (preferred, and what the canvas actually does) or insert `{" "}`.
9. **The Rust compiler does not repair invalid HTML.** The canvas nests `<p>` inside grid cells and uses `<span style="display:block">` inside buttons rather than `<div>`; keep that discipline — a `<div>` inside a `<p>` now renders as the browser parses it, not as the old compiler restructured it.
10. **Markdown is processed by Sätteri**, and `@astrojs/markdown-remark` is not installed by default. No remark/rehype plugin is needed here; if one ever is, it requires either a Sätteri MDAST/HAST port or installing `@astrojs/markdown-remark` and setting `markdown.processor: unified()`.

---

## Design tokens → Tailwind 4 theme

### The problem the naive port creates

The design system is built on runtime indirection: every component reads a semantic alias (`--bg-accent`, `--text-secondary`), the alias reads an accent slot (`--accent-600`), and `[data-accent="teal"]` remaps the whole slot to the slate ramp (colors.css `239–261`). Flattening those aliases to literal hex values in `@theme` — the obvious "port the tokens to Tailwind" move — destroys the mechanism the design system exists to provide, and would have to be redone by hand the day anything gets a second accent.

There is also a hard name collision. The `--text-*` prefix carries **two different kinds of token** in this system: font sizes (`--text-body: 15px`, typography.css `12`) and text colours (`--text-primary: var(--ink-900)`, colors.css `121`). Tailwind 4's `--text-*` namespace is font-size only. Putting the colour tokens into `@theme` under their existing names would generate a `text-primary` **font-size** utility whose value is `#0F1413`.

### The resolution

Three layers, in this order inside `src/styles/global.css`:

```css
@import "tailwindcss";

/* Verbatim from docs/design-import/tokens/, minus category.css and dark.css.
   Import order is load-bearing: light.css restates the derived accent aliases
   at equal specificity and must win over colors.css. Astro 6+ renders styles in
   source order, so this order is what ships. */
@import "./tokens/fonts.css";      /* @font-face only — no Google CDN import, see Fonts */
@import "./tokens/colors.css";
@import "./tokens/typography.css";
@import "./tokens/spacing.css";
@import "./tokens/shape.css";
@import "./tokens/motion.css";
@import "./tokens/light.css";
@import "./tokens/base.css";

@theme inline { /* … see below … */ }

@layer components { /* … the six primitives … */ }
```

`@theme inline` is the specific mechanism that keeps the cascade alive. A plain `@theme { --color-accent: var(--bg-accent); }` resolves `var(--bg-accent)` where the theme variable is *declared* (`:root`), permanently baking in the evergreen default. `@theme inline` emits the reference into the utility itself — `.bg-accent { background-color: var(--bg-accent) }` — so it resolves at the element, honouring `[data-accent="teal"]` on `<html>` and any nested scope. This is exactly the pattern Astro's own fonts guide prescribes for `--font-sans: var(--font-roboto)`.

Colour aliases are renamed on the way in to sidestep the `--text-*` collision and to keep foreground/background unambiguous:

```css
@theme inline {
  /* Surfaces */
  --color-paper: var(--bg-page);
  --color-surface: var(--bg-surface);
  --color-sunken: var(--bg-sunken);
  --color-inverse: var(--bg-inverse);
  --color-accent: var(--bg-accent);
  --color-accent-bold: var(--bg-accent-bold);
  --color-accent-deep: var(--bg-accent-deep);
  --color-accent-subtle: var(--bg-accent-subtle);
  --color-accent-tint: var(--bg-accent-tint);
  --color-ink-050: var(--ink-050);   /* hover fills, component-spec.md:20-21 */
  --color-ink-100: var(--ink-100);   /* press fills */

  /* Foregrounds — `fg` prefix so `text-fg-muted` can never be read as a size */
  --color-fg: var(--text-primary);
  --color-fg-muted: var(--text-secondary);
  --color-fg-subtle: var(--text-tertiary);
  --color-fg-disabled: var(--text-disabled);
  --color-fg-accent: var(--text-accent);
  --color-fg-on-accent: var(--text-on-accent);
  --color-fg-on-ground: var(--text-on-ground);
  --color-fg-inverse: var(--text-inverse);
  --color-fg-critical: var(--text-critical);

  /* Borders and icons */
  --color-hairline: var(--border-hairline);
  --color-strong: var(--border-strong);
  --color-focus: var(--border-focus);
  --color-icon: var(--icon-default);
  --color-icon-muted: var(--icon-muted);
  --color-icon-accent: var(--icon-accent);

  /* Type — design names already sit in Tailwind's namespaces */
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-data: var(--font-data);
  --font-editorial: var(--font-editorial);

  /* Shape, motion — override Tailwind's defaults with the design's scale */
  --radius-xs: var(--radius-xs);  /* … sm, md, lg, xl, full */
  --shadow-xs: var(--shadow-xs);  /* … sm, md, lg */
  --ease-standard: var(--ease-standard);
  --ease-enter: var(--ease-enter);
  --ease-exit: var(--ease-exit);

  /* Layout containers — deliberately NOT named `max`, which would shadow
     Tailwind's keyword utility `max-w-max` */
  --container-shell: 1200px;   /* --container-max */
  --container-reading: 720px;  /* --container-narrow */
}
```

Font sizes go in a **non-inline** `@theme` block, because they are literal values with no runtime indirection, and because Tailwind's per-size modifiers let one utility carry the size, leading and tracking the design always pairs:

```css
@theme {
  --text-body: 15px;      --text-body--line-height: 1.55;  --text-body--letter-spacing: -0.004em;
  --text-body-lg: 17px;   --text-body-lg--line-height: 1.55; --text-body-lg--letter-spacing: -0.006em;
  --text-label: 13px;     /* … caption, micro, headline, title, display-md, display-lg,
                                 num-md, num-lg, hero-num — all twelve from typography.css */
}
```

`text-title` then emits font-size, line-height and letter-spacing together, replacing the three-declaration inline style the canvas repeats at `93`, `184`, `373`, `540` and `609`.

### Spacing needs no port at all

The design's `--space-*` scale is a pure multiple of 4px above `--space-1`, which is exactly Tailwind's default `--spacing: 0.25rem` scale. Every design step has an exact default utility:

| Design token | px | Tailwind step |
|---|---|---|
| `--space-1` | 2 | `0.5` |
| `--space-2` | 4 | `1` |
| `--space-3` | 8 | `2` |
| `--space-4` | 12 | `3` |
| `--space-5` | 16 | `4` |
| `--space-6` | 20 | `5` |
| `--space-7` | 24 | `6` |
| `--space-8` | 32 | `8` |
| `--space-9` | 40 | `10` |
| `--space-10` | 48 | `12` |
| `--space-11` | 64 | `16` |
| `--space-12` | 80 | `20` |
| `--space-13` | 96 | `24` |
| `--space-14` | 128 | `32` |

So do not redefine `--spacing-*`; use `p-6`, `gap-5`, `py-20` and read this table when translating a canvas measurement. `spacing.css` is still imported so component CSS can reference `var(--space-6)` in the recipes quoted verbatim from `component-spec.md`.

### The focus ring is wrong for teal and must be overridden

`--ring-focus` is hardcoded to an evergreen rgba in two places — `shape.css:19` and `light.css:55`, both `rgba(18, 134, 106, 0.28)` — and unlike every other accent-derived value it is *not* remapped by the `[data-accent]` scopes. On a teal site the focus ring would be green. Override it once, after the token imports, deriving it from the live accent slot:

```css
:root { --ring-focus: 0 0 0 3px color-mix(in oklab, var(--accent-500) 28%, transparent); }
```

This is a fix, not a divergence: it produces the value the token file clearly intended per accent. Same class of issue, not fixed: `--shadow-*` uses a near-black `rgba(15,20,19,…)` described as "greenish-black" — that is a neutral ink shadow and is correct as-is.

### Resolved teal values, for reference

`data-accent="teal"` remaps the accent slot to the slate ramp (colors.css `239–261`): `--accent-900 #0A2C3B`, `800 #0E3C51`, `700 #135069`, `600 #176683`, `500 #1F87A9`, `400 #46A9C7`, `300 #86C9DD`, `200 #BDE1EC`, `100`/`050` `#E3F2F7`. So `--bg-accent` = `#176683`, `--text-accent`/`--text-link` = `#135069`, `--bg-accent-deep` (the dark full-bleed bands) = `#0E3C51`, `--border-focus` = `#1F87A9`. These are for reading the design against a rendered page; the CSS never hardcodes them.

### Fonts

`tokens/fonts.css` opens with an `@import url("https://fonts.googleapis.com/…")`. Replace that line with Astro's stable fonts config, which self-hosts the files, emits `@font-face`, and generates optimized fallback metrics — and keep every `--font-*` role declaration in the file untouched:

```js
// astro.config.mjs
fonts: [
  { provider: fontProviders.google(), name: 'Instrument Sans',  cssVariable: '--font-instrument-sans',  weights: ['400 700'], styles: ['normal', 'italic'], subsets: ['latin'] },
  { provider: fontProviders.google(), name: 'Instrument Serif', cssVariable: '--font-instrument-serif', weights: [400],       styles: ['normal', 'italic'], subsets: ['latin'] },
  { provider: fontProviders.google(), name: 'IBM Plex Mono',    cssVariable: '--font-ibm-plex-mono',    weights: [400, 500],  styles: ['normal'],           subsets: ['latin'] },
]
```

`fonts.css` then reads `--font-sans: var(--font-instrument-sans), ui-sans-serif, system-ui, …`, preserving the comment block explaining that these three families *are* the brand. `BaseLayout` renders `<Font cssVariable="--font-instrument-sans" preload />` (imported from `astro:assets`) plus non-preloaded `<Font />` tags for the other two — the display and body roles both resolve to Instrument Sans, so it is the only above-the-fold family worth preloading. IBM Plex Mono weight 600 is dropped: `component-spec.md` uses `--font-data` at weight 500 only (Badge, `44`).

---

## Component layer

### Where the boundary sits

Tailwind utilities carry layout, spacing and type everywhere. A small `@layer components` block in `src/styles/components.css` carries the six design-system primitives, because `component-spec.md` specifies them as token-driven recipes with hover/press/disabled/invalid states — encoding `bg-accent hover:bg-[--accent-hover] active:scale-[0.985] …` on every button is both unreadable and easy to drift, and the React island would have to repeat the string. Utility-first still holds for everything else; this is five classes, not a framework.

```css
@layer components {
  .e30-btn { /* inline-flex, gap: var(--space-3), radius var(--radius-md),
                font-weight var(--weight-medium), letter-spacing -0.004em, nowrap,
                transition transform var(--dur-instant) var(--ease-standard) */ }
  .e30-btn--sm / --md / --lg      /* heights var(--control-h-sm|md|lg); pads 14/18/22px */
  .e30-btn--primary / --secondary / --ghost / --critical
  .e30-btn:active { transform: scale(var(--press-scale)); }
  .e30-btn:disabled { background: var(--bg-sunken); color: var(--text-disabled); cursor: not-allowed; }

  .e30-card, .e30-card--subtle|accent|bold|deep|inverse, .e30-card--interactive
  .e30-badge, .e30-badge--neutral|accent|safe|tight|over|info|bold
  .e30-field  /* the shared Input/Select/Textarea box: h var(--control-h-md), radius md,
                 border hairline, :focus → border-focus + box-shadow var(--ring-focus),
                 [aria-invalid="true"] → border var(--clay-600) */
  .e30-shot   /* dashed placeholder: 1px dashed var(--border-strong), bg var(--bg-sunken) */
}
```

Every declaration traces to a line in `component-spec.md`; implement it by reading that file, not by eyeballing the canvas's inline styles.

### Astro components

| Component | Props | Notes |
|---|---|---|
| `Button.astro` | `variant`, `size`, `href?`, `fullWidth?`, `type?` | Renders `<a>` when `href` is set, `<button>` otherwise. `component-spec.md:13–27`. |
| `Card.astro` | `tone`, `padding`, `interactive?`, `href?` | `interactive` + `href` → `<a class="e30-card e30-card--interactive">` (the canvas's clickable app/post cards are `onClick` buttons; on a static site they must be real links for crawlers and middle-click). `:29–39`. |
| `Badge.astro` | `tone` | Status mapping from `:46`: released → `safe`, development/beta/"name not final"/"coming soon" → `info`. |
| `Select.astro` | `label`, `name`, `options`, `required?` | Native `<select>`, `appearance: none`, absolutely positioned `chevron-down`. `:57–60`. |
| `Wordmark.astro` | `size`, `tone` | "Eleven" + "30", the "30" in `--text-accent` (or `--accent-300` when `tone="light"`). `:62–67`. |
| `Monogram.astro` | `size` | Squircle `radius = 0.24 × size`, `--bg-accent` fill, "30" at `0.62 × size` weight 800. |
| `Icon.astro` | `name`, `size?` | Inline SVG — see below. |
| `Section.astro` | `tone` (`paper`/`sunken`/`deep`/`bold`/`inverse`), `width` (`shell`/`reading`), `pad?` | The alternating full-bleed band from `component-spec.md:74`: full-bleed background, `max-w-shell` (or `max-w-reading`) centred inner, hairline top/bottom on `sunken`. Used on every page; it is the single largest source of duplicated markup in the canvas. |
| `PlaceholderMedia.astro` | `icon`, `caption`, `dimensions`, `aspect`, `radius?`, `onDark?` | The dashed box with the intended pixel size, e.g. `Countdown screen / 1290 × 2796` (canvas `72–75`). `onDark` switches to the translucent white variant used at `158–161`. |
| `FeatureCard.astro` | `icon`, `title`, `body` | One shape covers `launchFacts`, `tipFeatures`, `principles` and `services` — the canvas renders all four with identical markup (`269–273`, `340–344`, `460–464`, `500–504`). |
| `AppCard.astro` | `app` (collection entry), `layout` (`grid`/`row`) | `grid` for the home page (`87–101`), `row` for `/apps/` (`177–194`). |
| `PostRow.astro` | `post`, `dense?` | `dense` for the home page's three recent posts (`116–122`), full for `/blog/` (`367–377`). |
| `DefinitionRow.astro` | `label`, `slot` | The `150px | 1fr` label/body row shared by `/now/` (`480–483`) and `/changelog/` (`572–590`). |
| `SiteHeader.astro` / `SiteFooter.astro` | — | Header `35–54`; footer `624–646`. |
| `Prose.astro` | — | Wraps rendered Markdown; styles `h2`/`p`/`ul`/`blockquote`/`a` with the post and policy type scale from canvas `393–403` and `606–617`. Hand-written, not `@tailwindcss/typography` — the plugin's defaults would have to be overridden token by token to match, which is more work than the twenty declarations it replaces. |

`SiteHeader` marks the active nav item with the 2px accent underline (`component-spec.md:73`). Active state is derived from `Astro.url.pathname` with prefix matching, mirroring the canvas's grouping (`750–756`): `/apps/*` → Apps, `/blog/*` → Blog, `/about/` and `/now/` → About, `/consulting/` → Consulting, `/contact/` → Support.

The footer's `Help` column resolves DECISIONS §3's open nav call as: **Support** (`/contact/`), **App privacy** (`/apps/` — the jumping-off point, since there is no single privacy page), **Home**. Each app's own page and each policy page carry the direct privacy links.

### Icons

The canvas uses 27 Tabler glyphs via the webfont CDN, and `component-spec.md:9–11` says self-host before production. Neither the CDN (a third-party request, forbidden by brief §8 without asking) nor the self-hosted webfont (a ~100KB font file for 27 glyphs, against a Lighthouse ≥95 target) is the right answer for a static site that ships no JS.

Instead: copy the needed SVGs out of the `@tabler/icons` devDependency into `src/icons/*.svg` (MIT, attribution kept in a `src/icons/README.md`), and inline them at build time:

```astro
---
// src/components/Icon.astro
interface Props { name: string; size?: number; class?: string }
const icons = import.meta.glob<string>('../icons/*.svg', { query: '?raw', import: 'default', eager: true });
---
```

The glob is build-time only; the rendered page contains plain `<svg>` markup, no font, no request, no JS. Inventory (27, from the canvas's `icon:` fields and inline `<i class="ti …">` usages): `rocket`, `receipt`, `camera`, `chevron-right`, `chevron-down`, `map-pin`, `calendar`, `clock`, `bell`, `wifi-off`, `eye`, `user`, `user-off`, `users`, `users-group`, `pencil`, `arrows-up-down`, `lock`, `mail`, `brand-github`, `circle-check`, `shield-check`, `device-mobile`, `ruler-2`, `message-circle`, `lifebuoy`, `file-text`.

The `apps` collection's required `icon: z.string()` field holds a glyph name (`rocket`, `receipt`) rather than an image path, because no icon artwork exists and the canvas renders exactly that: a Tabler glyph centred in a dashed tile (`90–92`, `179–181`). See [Assumptions and deferred work](#assumptions-and-deferred-work) item 3 for the one-line change when real icons arrive.

---

## Layouts and the page shell

```
src/layouts/BaseLayout.astro     # <html data-theme="light" data-accent="teal">, head, header, footer
src/layouts/PostLayout.astro     # wraps BaseLayout; post header, Prose, author block
src/layouts/PolicyLayout.astro   # wraps BaseLayout; policy header, Prose, contact block, disclaimer
```

`BaseLayout` props: `title`, `description`, `path` (for canonical), `ogType?` (default `website`), `jsonLd?` (an object, or array of objects). It sets `data-theme="light" data-accent="teal"` on `<html>` — both attributes on the same element, so `[data-theme="light"][data-accent]` in light.css `60–61` matches and the derived accent aliases resolve correctly.

Head contents: charset, viewport, `<title>`, description, canonical (`new URL(path, Astro.site)` — always with the trailing slash), `og:title` / `og:description` / `og:url` / `og:type` / `og:site_name`, `twitter:card=summary`, `<link rel="sitemap" href="/sitemap-index.xml">`, `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`, the three `<Font />` tags, and the icon links.

**Apostrophe handling** (brief §1): write `Rachel's Tip Calculator` with a plain ASCII apostrophe in frontmatter and site config, never `&#39;` or `&apos;`. Astro escapes attribute values and text nodes exactly once, so a pre-escaped entity is what produces a literal `&#39;` on screen. JSON-LD is emitted as `<script type="application/ld+json" set:html={ld}>` where `ld = JSON.stringify(obj).replace(/</g, '\\u003c')` — `set:html` does not escape, so the `<` replacement is what keeps a `</script>` in any future description from breaking out. Verify by grepping the built HTML for `&#39;` and `&amp;#`.

JSON-LD per page type: `WebSite` on `/`, `BlogPosting` on posts (headline, datePublished, dateModified, author, mainEntityOfPage), `SoftwareApplication` on app pages (name, applicationCategory, operatingSystem from `platforms`, offers only when a store URL exists).

**Favicon:** replace the starter's `public/favicon.svg` with the Monogram — a `#176683` squircle (`rx = 0.24 × size`) with a white "30" at `0.62 × size`, weight 800, `-0.03em` — and delete `public/favicon.ico` together with the starter's `<link rel="icon" href="/favicon.ico">`; a second icon file for a site with no legacy-IE audience is dead weight.

---

## Content model

### `src/content.config.ts`

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const apps = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/apps' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    platforms: z.array(z.enum(['ios', 'android', 'web'])).nonempty(),
    status: z.enum(['development', 'beta', 'released']),
    appStoreUrl: z.url().optional(),
    playStoreUrl: z.url().optional(),
    icon: z.string(),
    screenshots: z.array(z.string()).default([]),
    accentColor: z.string().optional(),
    order: z.number().default(0),
  }),
});

const policies = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/policies' }),
  schema: z.object({
    appSlug: z.string(),
    effectiveDate: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    dataCollected: z.array(z.string()),
    thirdParties: z.array(z.object({
      name: z.string(),
      purpose: z.string(),
      policyUrl: z.url(),
    })).default([]),
    childrenPolicy: z.boolean().default(false),
  }),
});

export const collections = { blog, apps, policies };
```

Field lists are the brief's §4 verbatim. `dataCollected` has **no** `.default([])` — it stays required so an author who adds an app cannot forget it, and the two seed policies satisfy it with an explicit `dataCollected: []` (decision 2). The `[^_]` in the glob pattern is Astro's documented convention for excluding underscore-prefixed drafts from the loader; it is additive to the `draft` flag, not a replacement for it.

`appSlug` is a plain `z.string()`, not `reference('apps')`. `reference()` is typed `ZodEffects<ZodString, {collection, id}>` — a transform — and current documentation does not state that it fails the build on a dangling reference, so it would not actually deliver the invariant; it would also turn `data.appSlug` into an object, complicating the policy→app back-link for no gain. The invariant is asserted explicitly instead.

### The build-time invariant

```ts
// src/lib/collections.ts
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type AppEntry = CollectionEntry<'apps'>;
export type PolicyEntry = CollectionEntry<'policies'>;

/** Apps in display order: `order` ascending, then name. */
export async function getApps(): Promise<AppEntry[]>;

/** Throws with the offending file path when the policy is missing or mislabelled. */
export async function getPolicyForApp(app: AppEntry): Promise<PolicyEntry>;

/** Both directions. Called from /apps/ and from the privacy route's getStaticPaths. */
export async function assertPolicyCoverage(): Promise<void>;
```

`getPolicyForApp` throws two distinct errors — `App "launch-window" (src/content/apps/launch-window.md) has no policy at src/content/policies/launch-window.md` and `Policy src/content/policies/x.md declares appSlug "y" but its filename id is "x"` — because brief §7 promises that bad content fails the build "with a file path in the error".

Coverage is structural rather than bolted on: `src/pages/apps/[app]/privacy.astro` generates its paths from the **apps** collection and calls `getPolicyForApp` for each, so an app without a policy cannot produce a build. `assertPolicyCoverage` additionally catches the reverse case (a policy file whose app was deleted) and is called from `/apps/index.astro`, which always builds.

### Site config

```ts
// src/config/site.ts
export const SITE = {
  name: 'Eleven30',
  domain: 'eleven30.xyz',
  url: 'https://eleven30.xyz',
  tagline: 'Independent software · Florida',
  description: 'Small apps, built by one person, finished properly.',
  contactEmail: 'hello@eleven30.xyz',   // brief §4: one address, one line to change
  replyWindow: 'Within 2 business days',
  location: 'Florida, United States',
  author: { name: '[Your name]', github: 'github.com/[handle]' }, // TODO(author)
} as const;
```

Per brief §4 the contact address is **not** per-policy frontmatter. It appears on `/about/` (canvas `804`), in three FAQ answers (`822`, `827`), in the contact card (`831`), and in both policies' closing section — every one of those reads `SITE.contactEmail`. The policy Markdown bodies therefore end their "Changes and contact" section *without* a literal address; `PolicyLayout` renders the address block. That is the difference between "one-line change" and "grep the legal documents".

### Seed content

**`src/content/apps/launch-window.md`** — `name: Launch Window`, `tagline` and `description` adapted from `APPS[0].pitch` / `longPitch` (canvas `660–661`, with "Working name only" retained), `platforms: [ios, android]`, `status: development`, `icon: rocket`, `order: 1`. No store URLs (none exist).

**`src/content/apps/rachels-tip-calculator.md`** — `name: Rachel's Tip Calculator`, copy from `APPS[1]` (`673–674`), `platforms: [ios]`, `status: released`, `icon: receipt`, `order: 2`. `appStoreUrl` omitted — see Open questions.

**`src/content/policies/*.md`** — two independently written documents, per decision 1 and brief §4's prohibition on shared partials. The split of the canvas's `privacySections` (`847–855`):

| Canvas section | `rachels-tip-calculator` | `launch-window` |
|---|---|---|
| What I collect | Yes — no account, no name/email unless you write in | Yes — same |
| Location | **No** — the app has no location feature; asserting one would be a false disclosure | Yes — on-device only, sorts sites and estimates visibility, not stored server-side, declinable |
| Launch data | No | Yes — public schedules, estimates change |
| Analytics and ads | Yes — plus "nothing leaves the phone" from `tipFeatures` (`785`) | Yes |
| Deleting your data | Yes | Yes |
| Children | Yes (`childrenPolicy: false` in frontmatter — the field records "not directed at children", which is what the prose says) | Yes |
| Changes and contact | Yes, address rendered by the layout | Yes, same |

Both carry the canvas's disclaimer verbatim (`618`): *"This page is a design placeholder written in plain language, not reviewed legal copy. Have a lawyer check it before you submit to the app stores."* The resemblance between the two documents is coincidental and they are edited separately, permanently.

**`src/content/blog/my-first-post.md`** — the canvas's first post (`683–684`) with `BODY`/`BODY2` (`699–708`) as the body and the pull-quote at `398`. Frontmatter carries a full ISO timestamp with offset per brief §7 (`pubDate: 2026-08-28T09:00:00-04:00`), `tags: ['build log']`, `draft: false`, and a `<!-- Placeholder post — replace or delete. -->` comment at the top of the body.

### Blog helpers

```ts
// src/lib/blog.ts
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]>;  // draft !== true, sorted pubDate desc
export function readingTime(body: string): string;                              // "6 min read", 200wpm, min 1
```

`getPublishedPosts` is the *only* way any route reads the blog collection — the index, `[...slug]`'s `getStaticPaths`, `rss.xml.ts` and the home page's recent-three all call it, which is how brief §7's "filtered out of every collection query *and* the RSS feed" and §9's "sorted by `pubDate` descending" become one implementation rather than four. Drafts are excluded in dev as well as production, so a draft never has a working URL to accidentally share. `updatedDate` is display-only and never a sort key.

`readingTime` exists because the canvas shows "6 min read" on the index (`375`) and the post header (`388`) and the schema has no such field; computing it from `entry.body` is cheaper and more honest than a frontmatter field authors must maintain.

---

## Routing

`trailingSlash: 'always'` with Astro's default `build.format: 'directory'` — the documented pairing. Every internal link ends in `/`, except `/rss.xml`, which cannot (Astro 6 forbids a trailing slash on extension-bearing endpoints).

| URL | File | Rendering | Copy source |
|---|---|---|---|
| `/` | `src/pages/index.astro` | prerendered | canvas `59–165`; apps + recent 3 posts + `nowItems` + consulting card |
| `/apps/` | `src/pages/apps/index.astro` | prerendered | canvas `168–198`; `getApps()` |
| `/apps/{slug}/` | `src/pages/apps/[app].astro` | prerendered | apps collection + per-app body (below) |
| `/apps/{slug}/privacy/` | `src/pages/apps/[app]/privacy.astro` | prerendered | policies collection, `PolicyLayout` |
| `/blog/` | `src/pages/blog/index.astro` | prerendered | canvas `360–381` |
| `/blog/{slug}/` | `src/pages/blog/[...slug].astro` | prerendered | canvas `384–415`, `PostLayout` |
| `/contact/` | `src/pages/contact.astro` | prerendered shell + island | canvas `523–562` |
| `/about/` | `src/pages/about.astro` | prerendered | canvas `418–470` |
| `/now/` | `src/pages/now.astro` | prerendered | canvas `473–487` |
| `/consulting/` | `src/pages/consulting.astro` | prerendered | canvas `490–520` |
| `/changelog/` | `src/pages/changelog.astro` | prerendered | canvas `565–594` |
| `/rss.xml` | `src/pages/rss.xml.ts` | prerendered | blog collection |
| `/404` | `src/pages/404.astro` | prerendered → `dist/404.html` | new; short "not found" using `Section` |
| `/api/contact` | `src/pages/api/contact.ts` | `export const prerender = false` | — |

`src/pages/apps/[app].astro` and `src/pages/apps/[app]/privacy.astro` coexist without a prerender conflict (`/apps/x/index.html` vs `/apps/x/privacy/index.html`); `prerenderConflictBehavior: 'error'` is set anyway so that any future collision against the frozen §5 contract fails loudly instead of silently picking a winner.

### One app route, two very different pages

The canvas designs Launch Window as a five-section landing page (`201–306`: hero, dark countdown band, three-step "How it works", facts grid, "what it doesn't do" + store-requirements links) and the tip calculator as two sections (`309–357`). Neither shape is expressible in the `apps` schema, and inventing `steps`/`facts`/`features` frontmatter arrays to force one template would be fabricating structure the brief did not specify.

`[app].astro` therefore renders the **shared** parts from collection data — back-link, icon tile, name, badges, tagline, description, CTAs, platform/price line, and the `appLinks` card (Privacy policy → `/apps/{slug}/privacy/`, Support → `/contact/`, Release notes → `/changelog/`, canvas `876–880`) — and delegates the marketing body to a per-app component resolved through a registry:

```ts
// src/components/apps/index.ts
export const APP_BODIES: Record<string, AstroComponentFactory | undefined> = {
  'launch-window': LaunchWindowBody,
  'rachels-tip-calculator': RachelsTipCalculatorBody,
};
```

A slug with no entry renders the shared shell alone — so brief §1's "adding an app is a content change rather than a code change" still holds; bespoke marketing is the optional part. The Launch Window body keeps the `Name not final` badge (decision 3) and the static countdown figures (`761–766`) rendered as a *typographic* band, not a live timer: it is a marketing screenshot of the product, and a `setInterval` would be JS on an otherwise zero-JS page, counting down to a date nobody set.

### Static page data

The four canvas-only pages read typed modules under `src/data/`, not collections: `now.ts` (`nowItems` for the home card, `nowLong` for `/now/`, plus the "updated 28 Aug 2026" stamp), `principles.ts`, `services.ts`, `faqs.ts`, `releases.ts`, `elsewhere.ts`. Shapes are `readonly` arrays with exported types. `releases.ts` renames the canvas's working titles: `Launch Countdown` → `Launch Window`, `Tip Calculator` → `Rachel's Tip Calculator` (decision 3).

`/changelog/` uses `Badge` with tone `info` for the `upcoming: true` entry (canvas `580–582`); the canvas's `Tag` component is not in `component-spec.md`, so the app label renders as a `neutral` Badge instead of inventing a seventh primitive.

### Feed, sitemap, robots

`src/pages/rss.xml.ts` calls `getPublishedPosts()`, maps to `{ title, pubDate, description, link: '/blog/' + post.id + '/' }`, sets `site: context.site`, and adds `customData: '<language>en-us</language>'`. Full-content `<item>` bodies are omitted: including them needs `markdown-it` + `sanitize-html` per the RSS guide, and Sätteri-rendered HTML is not reachable from the feed endpoint without re-parsing. Descriptions are already required and capped at 160 characters.

`@astrojs/sitemap` emits `sitemap-index.xml` and `sitemap-0.xml` — **not** `sitemap.xml`. `public/robots.txt` therefore reads:

```
User-agent: *
Allow: /

Sitemap: https://eleven30.xyz/sitemap-index.xml
```

Static rather than the `src/pages/robots.txt.ts` variant, because the domain is already in `SITE.url` and a second source of truth for one absolute URL is not worth an endpoint. `/api/contact` is excluded from the sitemap via `sitemap({ filter })`.

---

## Contact form

### The island

`src/components/ContactForm.tsx`, mounted `client:load` in `src/pages/contact.astro` — the only client directive on the site (brief §8). Everything else on `/contact/`, including the FAQ cards (`532–537`) and the contact-info card (`549–557`), is static Astro.

Fields, extending the canvas's three-field mock per DECISIONS' contact-form note:

| Field | Name | Required | Notes |
|---|---|---|---|
| Name | `name` | yes | added; brief §6 |
| Email | `email` | yes | canvas `543` |
| Which app? | `app` | **no** | canvas `544`; kept as triage context, optional so a general enquiry is not blocked. Options: both app names + "Something else". |
| Message | `message` | yes | replaces the canvas's single-line input `545` with a Textarea, `min-height` 120–160px, `padding: var(--space-3) var(--space-4)` (`component-spec.md:55`) |
| Honeypot | `website` | — | wrapped in a `.sr-only`-style container, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`. Named `website` because that is what bots fill. |
| Turnstile | `cf-turnstile-response` | yes | see below |

Turnstile uses **explicit** rendering: the script is loaded once from `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` (Cloudflare's docs require that exact URL — no proxying or caching), and the island calls `window.turnstile.render(ref, { sitekey, callback })` in an effect, storing the token in state. Explicit rather than implicit because tokens are **single-use with a 300-second lifetime**: after any non-2xx response the island must call `turnstile.reset()` and clear the stored token, or a retry submits a spent token and gets `timeout-or-duplicate`. That reset is the thing implicit rendering makes awkward.

The island `POST`s `application/json` and renders one of three states — idle, pending (button disabled, label "Sending…"), result (a success or failure message, never echoing what was typed). Client-side validation is a courtesy (`required`, `type="email"`, `maxLength={5000}`); the server repeats all of it.

### `src/pages/api/contact.ts`

```ts
export const prerender = false;
export const POST: APIRoute = async ({ request }) => { /* … */ };
export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
```

Brief §6's sequence, in order:

1. **Reject non-POST** — the `ALL` export returns `405` with an `Allow: POST` header.
2. **Honeypot** — if `body.website` is a non-empty string, return `200 {"ok":true}` and send nothing. Reading the JSON body is a precondition of this step, not a reordering of it: a malformed body returns `400` before anything else happens.
3. **Turnstile** — `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` (form-encoded: `secret`, `response`, `remoteip` from `CF-Connecting-IP`). Non-`success` → `403 {"ok":false,"error":"challenge_failed"}`. A missing token short-circuits to the same response without a network call.
4. **Zod** — `astro/zod`: `name` 1–80 trimmed, `email` via `z.email()` capped at 254, `message` 1–5000 trimmed, `app` optional enum of the two slugs plus `other`. Failure → `400 {"ok":false,"error":"invalid"}` with no field echo.
5. **Resend** — `POST https://api.resend.com/emails`, `Authorization: Bearer ${RESEND_API_KEY}`, JSON body `{ from, to: [CONTACT_TO_EMAIL], subject, text, reply_to: email }`. `from` is a verified-domain address (`Eleven30 site <noreply@eleven30.xyz>`); `reply_to` is the submitter, so hitting reply answers the person. Body is `text`, not `html` — there is nothing to format and it removes an escaping surface entirely. Non-2xx → log status and Resend's error body server-side, return `500 {"ok":false,"error":"send_failed"}`.
6. **Return JSON** — `200 {"ok":true}`. No submitted content appears in any response, ever.

Called directly with `fetch`, not the `resend` SDK, for the reason in [Stack](#stack-and-pinned-versions).

### Secrets and environment

```ts
import { env } from 'cloudflare:workers';
```

`Astro.locals.runtime` no longer exists in `@astrojs/cloudflare` v13+. `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY` and `CONTACT_TO_EMAIL` are set with `npx wrangler secret put <KEY>` and, locally, in a `.dev.vars` file that must be added to `.gitignore` (the starter's `.gitignore` covers `.env`/`.env.production` but not `.dev.vars`). None of the three appears in `astro.config.mjs`, client code, or a `PUBLIC_` variable (brief §8). A small `requireEnv(name)` helper returns a 500 with a server-side log naming the missing key rather than throwing an unhandled error into the Worker.

`astro:env` was considered and rejected: its documented behaviour is that *all* secrets are validated whenever anything imports `astro:env/server`, "so you may need to pass dummy environment variables to satisfy this validation during the build" — which would couple `npm run build` (brief §9's first acceptance item) to secrets that do not exist in this environment. Reading `env` lazily inside the handler keeps the build independent of them.

The Turnstile **site** key is public and lives in `PUBLIC_TURNSTILE_SITE_KEY`. Astro 6+ *always inlines* `import.meta.env` values at build time, so this must be present in the **Workers Builds environment**, not only as a runtime secret — a runtime-only value would inline as `undefined`. For local development and for a build with no configuration, fall back to Cloudflare's published always-passes test key `1x00000000000000000000AA` and log a warning; the matching server-side test secrets are `1x0000000000000000000000000000000AA` (always passes) and `2x0000000000000000000000000000000AA` (always fails), which is what makes the endpoint testable at all without a real widget.

---

## Deployment

`wrangler.jsonc` at the repo root (brief §3):

```jsonc
{
  "name": "eleven30-site",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-09-03",
  "assets": {
    "html_handling": "force-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

- `main` is the adapter entrypoint, not `dist/_worker.js/index.js` (changed in Astro 6).
- `assets.directory` is **omitted**: the adapter runs Cloudflare's Vite plugin, which points at the client build output itself, and Wrangler's own docs say `directory` is "not required if you're using the Cloudflare Vite plugin".
- `force-trailing-slash` makes brief §5's "pick one form and never serve both" a platform-level guarantee. With `build.format: 'directory'` every page is already `foo/index.html`, so the default `auto-trailing-slash` would behave identically today; being explicit means a stray `foo.html` in `public/` can never open a second canonical URL. It does not affect `/rss.xml`, `/robots.txt` or the sitemaps — HTML handling applies to HTML only.
- `not_found_handling: "404-page"` serves the nearest `404.html`. Astro special-cases `src/pages/404.astro` and builds it to `404.html` even under `directory` format, so this resolves.
- No `kv_namespaces`, no D1, no bindings of any kind (brief §8). `session: false` in `astro.config.mjs` is what makes that true: the Cloudflare adapter otherwise auto-provisions a `SESSION` KV namespace on deploy, and setting `session: false` also drops the session runtime from the Worker bundle.

Workers Builds: `npm run build`, output `dist`, Node from `.nvmrc`. Cloudflare Pages is not an option — `@astrojs/cloudflare` removed Pages support entirely.

`package.json` scripts: `"build": "astro check && astro build"`, plus `"verify": "node scripts/verify-build.mjs"` (below). Per `AGENTS.md`, the dev server is started with `astro dev --background` and managed with `astro dev status` / `logs` / `stop`.

---

## Verification

There is no test runner in the repository and this build does not add one — there is no domain logic to unit-test, and the acceptance criteria in brief §9 are about built output and runtime behaviour. Verification is therefore one script plus a short, explicit manual procedure.

- **`scripts/verify-build.mjs`** (run by `npm run verify` after `npm run build`). Asserts, against `dist/`, that: every URL in brief §5 exists as `<path>/index.html` — `/`, `/blog/`, `/blog/my-first-post/`, `/apps/`, `/apps/launch-window/`, `/apps/launch-window/privacy/`, `/apps/rachels-tip-calculator/`, `/apps/rachels-tip-calculator/privacy/`, `/contact/` — plus `/about/`, `/now/`, `/consulting/`, `/changelog/`; that `dist/rss.xml`, `dist/404.html`, `dist/sitemap-index.xml` and `dist/robots.txt` exist; that `robots.txt` contains the absolute sitemap URL; that no page other than `/contact/` contains a `<script type="module">` tag (brief §9's zero-JS item, checkable without a browser); and that no built HTML contains `&#39;` or `&amp;#` (the apostrophe-escaping trap in brief §1).
- **Negative build checks**, run by hand and recorded in the PR: (a) rename `src/content/policies/launch-window.md` → the build must fail naming that file; (b) delete `pubDate` from the seed post → the build must fail naming that file; (c) set `dataCollected` to a string → the build must fail. These are brief §9's second and third checklist items and they cannot be asserted by a script that only inspects a successful build.
- **Endpoint checks** against `astro preview` (which runs real `workerd`), with `.dev.vars` holding the Turnstile test secrets: honeypot filled → `200` and no Resend call (assert by pointing `RESEND_API_KEY` at nothing and confirming no 500); token omitted → `403`; token present with the always-fails secret `2x0000000000000000000000000000000AA` → `403`; `GET /api/contact` → `405` with `Allow: POST`; oversized message → `400`.
- **Manual**: Lighthouse ≥95 on `/`, `/blog/my-first-post/` and `/apps/launch-window/`; layout at 375px width; keyboard focus visible on every control (the `--ring-focus` override above is what makes it teal); each app page links to its own policy and each policy links back.

End-to-end mail delivery — brief §9's "delivers real mail end to end" — **cannot be verified in this environment** and must be signed off by the author after `wrangler secret put` and Resend domain verification (which needs DNS records in Cloudflare, per brief §6).

---

## Assumptions and deferred work

1. **`https://eleven30.xyz` is the production origin.** It is the domain in the canvas footer (`644`) and the contact address. `site` in `astro.config.mjs`, the canonical tags, the sitemap and `robots.txt` all depend on it; if the site ships on a different hostname first, that is one config change plus a rebuild (the sitemap and feed are absolute-URL outputs).
2. **Light mode only.** `data-theme="light"` is fixed on `<html>` and `tokens/dark.css` is not imported. Users with a dark OS preference get the light design, which is what the canvas specifies.
3. **`apps.icon` holds a Tabler glyph name, not an image path.** No icon artwork exists and `public/apps/` will ship empty. When real icons land, the field's value becomes a path under `/apps/` and `AppIcon` branches on a leading `/` — one component, one condition, no schema change.
4. **No `og:image`.** Open Graph title/description/url/type/site_name are present on every page type (brief §9), but a card image needs artwork or a generated-image endpoint (`satori` + the `experimental_getFontFileURL` path in the fonts guide), which is a project of its own.
5. **Font sizes ship in px**, exactly as `typography.css` declares them. Browser zoom still works; a user's *default font size* preference does not scale the design. Converting the twelve `--text-*` values to rem (÷16) is a mechanical change confined to one block if that trade is ever revisited.
6. **The static countdown on the Launch Window page is typography, not a timer** — see [Routing](#one-app-route-two-very-different-pages).
7. **No CSP.** `security.csp` is stable in Astro 6+, but Turnstile's script, its iframe, and Tailwind's emitted styles each need policy work, and getting it wrong breaks the one interactive feature on the site. Worth doing after the form is verified working.
8. **No rate limiting** on `/api/contact` — every durable store is forbidden by brief §8.

---

## Open questions

1. **`dataCollected` and `thirdParties` ship empty, and only the author can fill them.** This is brief §10's open decision 1, and it is a store-submission blocker, not a nicety: Apple compares policy text against the privacy nutrition labels in the listing and a mismatch is a rejection risk. Both files ship `dataCollected: []` / `thirdParties: []`. Launch Window in particular is described in the brief as sending push notifications and talking to a backend — if that is still true, device tokens and the backend provider need explicit disclosure, and the prose in this design (adapted from the canvas, which only claims on-device location) will need to be revised alongside the arrays. **Needs the author before either app is submitted.**
2. **Is there an App Store URL for Rachel's Tip Calculator?** Its status is `released` ("On the App Store", canvas `319`) but no URL appears anywhere in the design. `appStoreUrl` is optional in the schema, so the build passes without it and the page renders a disabled-looking "Download for iOS" CTA — which is wrong for a shipped app. **Needs the author.**
3. **Resend `from` address.** `noreply@eleven30.xyz` is assumed. Resend requires domain verification via DNS before it will send from that domain (brief §6); if verification lands on a subdomain (`mail.eleven30.xyz`), the constant changes.
4. **`[Your name]` and `github.com/[handle]`** are deliberately unfilled per decision 7 and will render literally on `/about/`, in the post byline, and in the footer blurb. Confirm that is acceptable for a first deploy, or supply the values.

Resolved during design rather than left open: whether to use `reference('apps')` for the policy cross-link (no — see [Content model](#srccontentconfigts)); whether the extra pages need a collection (no — decision 6); whether to keep the canvas's "Which app?" select (yes, optional); whether to self-host the Tabler webfont or inline SVGs (inline — see [Icons](#icons)); whether `astro:env` should own the secrets (no — see [Secrets and environment](#secrets-and-environment)); and whether the design tokens should be flattened into `@theme` (no — `@theme inline` over the existing cascade).

---

## Verified facts

Checked directly against the repository, the npm registry and current documentation on 2026-09-03, rather than assumed.

- The worktree contains only `astro.config.mjs` (an empty `defineConfig({})`), `package.json`, `package-lock.json`, `tsconfig.json`, `AGENTS.md` (symlinked as `CLAUDE.md`), `README.md`, `public/favicon.{svg,ico}` and `src/pages/index.astro` (the stock starter page). There is no `src/content/`, `src/components/`, `src/layouts/`, `src/styles/`, `wrangler.jsonc`, `.nvmrc`, `docs/specs/` or `.dev.vars`.
- `package.json` pins `astro: ^7.3.1` and `engines.node >= 22.12.0`; `package-lock.json` resolves `astro@7.3.1`, `vite@8.2.2` and `zod@4.5.4`.
- `.gitignore` covers `.env` and `.env.production` but **not** `.dev.vars`.
- Latest published versions: `astro` 7.3.1, `@astrojs/cloudflare` 14.3.0 (peers `astro ^7.2.0`, `wrangler ^4.125.0`), `@astrojs/react` 6.0.5 (depends on `vite ^8.0.13`), `@astrojs/rss` 4.0.19, `@astrojs/sitemap` 3.7.4, `@astrojs/mdx` 8.0.0, `tailwindcss` / `@tailwindcss/vite` 4.3.3, `wrangler` 4.129.0, `react` / `react-dom` 19.2.8, `@tabler/icons` 3.46.0 (MIT), `resend` 6.26.0 (peer-depends on `@react-email/render`).
- Astro 6 deprecated `z` from `astro:content` and `astro:schema` in favour of `astro/zod`, and upgraded to Zod 4 — `z.string().url()` and `z.string().email()` are superseded by `z.url()` and `z.email()`.
- Content Layer API in Astro 7: `glob` from `astro/loaders`, config at `src/content.config.ts`, `entry.id` is the slug, `entry.slug`/`entry.render()` removed, rendering via `render(entry)` from `astro:content`, and `getCollection()` order is explicitly non-deterministic.
- `reference()` is typed `(collection) => ZodEffects<ZodString, { collection, id }>`; the documentation describes it as a transform and does not state that a dangling reference fails the build.
- Astro 7 defaults `compressHTML` to `'jsx'`, makes the Rust compiler the only compiler, and makes Sätteri the default Markdown processor with `@astrojs/markdown-remark` no longer installed.
- Astro 6 forbids trailing slashes on endpoints whose URL has a file extension, regardless of `trailingSlash`.
- `import.meta.env` values are always inlined at build time since Astro 6 and are never coerced.
- Astro builds `src/pages/404.astro` to `404.html` (not `404/index.html`) even with `build.format: 'directory'`.
- `@astrojs/cloudflare` v13+ removed `Astro.locals.runtime` (use `import { env } from 'cloudflare:workers'`), removed Cloudflare Pages support, changed `wrangler.jsonc`'s `main` to `@astrojs/cloudflare/entrypoints/server`, and auto-provisions a `SESSION` KV namespace unless `session: false` is set in the Astro config.
- Wrangler's `assets.directory` is not required when the Cloudflare Vite plugin is in use; `html_handling` accepts `auto-trailing-slash` (default) / `force-trailing-slash` / `drop-trailing-slash` / `none`; `not_found_handling` accepts `single-page-application` / `404-page` / `none` and defaults to `none`.
- Tailwind 4 is wired through `@tailwindcss/vite` (`npx astro add tailwind`), not an Astro integration; `@astrojs/tailwind` is Tailwind 3 legacy only.
- Tailwind 4 theme namespaces include `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`, `--leading-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--container-*`; per-size modifiers `--text-<name>--line-height`, `--text-<name>--letter-spacing` and `--text-<name>--font-weight` are supported; `@theme inline` emits the referenced variable into the utility so it resolves at the element rather than at `:root`.
- Tailwind's default `--spacing` is `0.25rem`, so every `--space-*` token in `spacing.css` has an exact default utility step (table above).
- Astro's fonts API is stable in 6+: configured under `fonts` in `astro.config.mjs` with `fontProviders.google()`, consumed via `import { Font } from 'astro:assets'` and `<Font cssVariable="…" preload />`; the docs' own Tailwind 4 recipe is `@theme inline { --font-sans: var(--font-roboto); }`.
- `@astrojs/sitemap` emits `sitemap-index.xml` and `sitemap-0.xml`, not `sitemap.xml`.
- Turnstile: siteverify is `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` + `response` (+ optional `remoteip`, `idempotency_key`); tokens are single-use, max 2048 chars, valid 300s, and a reused token returns `timeout-or-duplicate`; the client script must be loaded from its exact URL and may not be proxied or cached; implicit rendering injects a hidden input named `cf-turnstile-response`; test keys are sitekey `1x00000000000000000000AA` (always passes) and secrets `1x0000000000000000000000000000000AA` / `2x0000000000000000000000000000000AA` (always pass / always fail).
- Resend's REST endpoint is `POST https://api.resend.com/emails` with `Authorization: Bearer <key>` and a JSON body using `from`, `to`, `subject`, `html`/`text` and `reply_to`.
- `tokens/shape.css:19` and `tokens/light.css:55` both hardcode `--ring-focus: 0 0 0 3px rgba(18, 134, 106, 0.28)` — an evergreen value that no `[data-accent]` scope overrides.
- `tokens/colors.css:239–261` maps `data-accent="teal"` onto the slate ramp, giving `--bg-accent: #176683` and `--text-accent: #135069`.

---

## Changelog

- **2026-09-03** — Initial draft. Written against Astro 7.3.1 / Tailwind 4.3.3 / `@astrojs/cloudflare` 14.3.0 with every API shape re-verified against current documentation, because the brief's §4 sample code and most training data predate Astro 6 and 7. Four corrections to the brief's own sample are recorded in [Astro 7 deltas](#astro-7-deltas-that-invalidate-the-briefs-sample-code); one defect in the imported design tokens (the evergreen focus ring under a teal accent) is recorded in [Design tokens](#the-focus-ring-is-wrong-for-teal-and-must-be-overridden).
</content>
</invoke>
