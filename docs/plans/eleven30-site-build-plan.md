# Eleven30 personal site build — Implementation Plan

> For agentic workers: implement this plan task-by-task via this repo's `implementation` skill (implementer → reviewer → committer, one task at a time). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the untouched Astro minimal-template scaffold into the full Eleven30 site — token-driven design system, three content collections with a build-time privacy-coverage invariant, eleven routes plus a feed and a contact API, deployed to Cloudflare Workers — exactly as specified in the design.

**Architecture:** A Tailwind 4 theme (`src/styles/global.css` + `src/styles/components.css`) sits directly on top of the verbatim-imported design tokens (`src/styles/tokens/*.css`), using `@theme inline` so the runtime `[data-accent]`/`[data-theme]` cascade keeps working after the port. Six token-driven primitives (Button, Card, Badge, Input/Textarea, Select, Wordmark/Monogram) plus an inline-SVG `Icon` and a set of recurring layout patterns (Section, PlaceholderMedia, FeatureCard, DefinitionRow, AppCard, PostRow) form the component layer that every page is built from. Three Astro layouts (Base/Post/Policy) wrap all pages in the shared header/footer/head. Content lives in three Content-Layer collections (`blog`, `apps`, `policies`) declared in `src/content.config.ts`; a `src/lib/collections.ts` module asserts — structurally, via `getStaticPaths` plus an explicit reverse check — that every app has a policy and vice versa, so a missing policy fails the build rather than the store review. Eleven prerendered routes plus `/rss.xml`, `/404`, and one non-prerendered `POST /api/contact` (Cloudflare Worker, secrets via `cloudflare:workers`, Turnstile + Resend by direct `fetch`) complete the site; a post-build Node script (`scripts/verify-build.mjs`) checks the built `dist/` output against the URL contract and the zero-JS/apostrophe-escaping invariants.

**Tech Stack:** Astro 7.3.1, Tailwind 4.3.3 (`@tailwindcss/vite`), `@astrojs/cloudflare` 14.3.0, `@astrojs/react` 6.0.5 + React 19.2.8 (one island), `@astrojs/sitemap` 3.7.4, `@astrojs/rss` 4.0.19, `astro/zod` (Zod 4, re-exported — not a direct dependency), `@tabler/icons` 3.46.0 (devDependency, source SVGs only), Wrangler 4.129.0, TypeScript. None of this is in the current scaffold today — every package above is a new addition this plan installs.

**Spec:** `docs/specs/eleven30-site-build-spec.md` — read it first for the full rationale (why `@theme inline` instead of flattening tokens, why `appSlug` is a plain string instead of `reference()`, why Resend is called by `fetch` instead of its SDK, etc.); this plan implements it task-by-task without repeating the why.

---

## Global Constraints

- **Astro 7 / Zod 4 API only, never the v5-era shapes.** `import { defineCollection } from 'astro:content'` + `import { z } from 'astro/zod'` (never `z` from `astro:content`); `z.url()` / `z.email()` (never `.string().url()` / `.string().email()`); `entry.id` is the slug (`entry.slug` doesn't exist); render via `const { Content } = await render(entry)` imported from `astro:content`; `import { env } from 'cloudflare:workers'` for secrets (`Astro.locals.runtime` doesn't exist). See spec §"Astro 7 deltas" for the full list — every task below assumes it.
- **`trailingSlash: 'always'` everywhere** except `/rss.xml`, which can never have one (Astro 6 forbids a trailing slash on any endpoint URL with a file extension, regardless of `trailingSlash`).
- **No dark mode.** `tokens/dark.css` and `tokens/category.css` are never imported. `data-theme="light"` is hardcoded on `<html>`; nothing toggles it.
- **No real screenshots, app icons, portrait, or OG images.** The dashed-placeholder treatment (`.e30-shot`) stays everywhere the canvas shows one. `apps.icon` holds a Tabler glyph name, not an image path.
- **No MDX, no rate limiting on `/api/contact`, no analytics/chat/embeds beyond the required Turnstile script, no CSP work.** All explicitly out of scope — do not add any of them opportunistically.
- **No content collection for About/Now/Consulting/Changelog.** Plain `.astro` pages reading typed arrays from `src/data/*.ts`.
- **Secrets never in `astro.config.mjs`, client code, or a `PUBLIC_`-prefixed variable** — except `PUBLIC_TURNSTILE_SITE_KEY`, which is the one value that must be public and inlined at build time.
- **The two policy Markdown files are never deduplicated.** No shared partial, template, or composition layer between them, even where prose is similar — this is permanent, not a first-draft shortcut.
- **`dataCollected` and `thirdParties` ship as empty arrays (`[]`) in both seed policies.** Do not infer, generate, or fill them in from app behavior described elsewhere in the spec/brief — flag them to the author instead.
- **Identity placeholders stay literal.** `[Your name]` and `github.com/[handle]` render unfilled; do not invent values.
- **Use `astro dev --background`** (per this repo's `CLAUDE.md`) if a task needs a running dev server; prefer `astro build` / `astro check` for verification inside a task.
- **Package versions are pinned, not "latest".** Use exactly the versions in the spec's Stack table (Task 1) unless a version is genuinely unavailable, in which case stop and flag it rather than silently substituting.

## File Structure

```
src/
  content.config.ts          # blog / apps / policies collection schemas
  config/site.ts              # SITE constant — the one place contactEmail etc. live
  lib/
    collections.ts            # getApps, getPolicyForApp, assertPolicyCoverage
    blog.ts                    # getPublishedPosts, readingTime
  data/                        # typed copy arrays for the 4 non-collection pages
    now.ts principles.ts services.ts faqs.ts releases.ts elsewhere.ts
  icons/                       # 27 inlined Tabler SVGs + README.md (attribution)
  styles/
    tokens/                    # tokens/*.css copied verbatim, minus dark.css/category.css
    global.css                 # @import chain + @theme inline + @theme (font sizes)
    components.css             # @layer components — the 6 primitive recipes
  components/
    Icon.astro Button.astro Card.astro Badge.astro Input.astro Textarea.astro Select.astro
    Wordmark.astro Monogram.astro Section.astro PlaceholderMedia.astro FeatureCard.astro
    DefinitionRow.astro AppCard.astro PostRow.astro SiteHeader.astro SiteFooter.astro
    Prose.astro ContactForm.tsx                     # the only client-side island
    apps/
      index.ts                # APP_BODIES registry
      LaunchWindowBody.astro RachelsTipCalculatorBody.astro
  layouts/
    BaseLayout.astro PostLayout.astro PolicyLayout.astro
  content/
    blog/my-first-post.md
    apps/launch-window.md apps/rachels-tip-calculator.md
    policies/launch-window.md policies/rachels-tip-calculator.md
  pages/
    index.astro contact.astro rss.xml.ts 404.astro
    blog/index.astro blog/[...slug].astro
    apps/index.astro apps/[app].astro apps/[app]/privacy.astro
    about.astro now.astro consulting.astro changelog.astro
    api/contact.ts
scripts/verify-build.mjs       # post-build assertions against dist/
wrangler.jsonc  .nvmrc
```

---

## Task 1: Project configuration and dependencies

**Files:**
- Modify: `package.json` (dependencies, devDependencies, scripts)
- Modify: `astro.config.mjs` (full rewrite)
- Modify: `.gitignore` (add `.dev.vars`)
- Create: `wrangler.jsonc`
- Create: `.nvmrc`

**Interfaces:**
- Consumes: nothing (first task).
- Produces (base `astro.config.mjs` shape — Task 2 adds a `fonts` array to it, Task 24 adds a `filter` option to the `sitemap()` call; both are additive edits to this file, not replacements):
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://eleven30.xyz',
  trailingSlash: 'always',
  output: 'static',
  session: false,
  prerenderConflictBehavior: 'error',
  adapter: cloudflare(),
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Install pinned dependencies.** Add to `dependencies`: `astro` (keep `^7.3.1`), `@astrojs/cloudflare@14.3.0`, `@astrojs/react@6.0.5`, `react@19.2.8`, `react-dom@19.2.8`, `@astrojs/sitemap@3.7.4`, `@astrojs/rss@4.0.19`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`. Add to `devDependencies`: `wrangler@4.129.0`, `@tabler/icons@3.46.0`, `@astrojs/check`, `typescript`. Do not add `zod`, `resend`, `@astrojs/mdx`, or `@tabler/icons-webfont` — the spec explicitly excludes each (astro/zod re-export, direct `fetch` to Resend's REST API, no MDX, inline SVGs not a webfont). Run `npm install` and confirm it completes without peer-dependency errors (the adapter peer-requires `astro ^7.2.0` and `wrangler ^4.125.0`; `@astrojs/react` peer-requires `vite ^8.0.13`, which Astro 7 already provides).
- [ ] **Step 2: Write `astro.config.mjs`** to the shape in Produces above. `output: 'static'` is the default but state it explicitly per spec (only `/api/contact` opts out with its own `export const prerender = false`, later). Confirm `astro check` and `astro build` (on the still-mostly-empty project) both run without config errors — the build will still only produce the stock starter page at this point, that's expected.
- [ ] **Step 3: Add `package.json` scripts.** `"build": "astro check && astro build"`, `"verify": "node scripts/verify-build.mjs"` (the script itself doesn't exist until Task 25 — `npm run verify` will fail with "file not found" until then; that's expected and not a regression to fix now), keep `dev`/`preview`/`astro` as-is.
- [ ] **Step 4: Create `wrangler.jsonc`** at the repo root with exactly:
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
  Do not add `assets.directory`, `kv_namespaces`, D1 bindings, or any other bindings.
- [ ] **Step 5: Create `.nvmrc`** containing exactly `22.12.0` (matches `package.json`'s existing `engines.node >= 22.12.0`).
- [ ] **Step 6: Add `.dev.vars` to `.gitignore`.** The starter's `.gitignore` covers `.env`/`.env.production` but not `.dev.vars`, which will hold the three contact-form secrets locally starting in Task 22 — it must never be committed.
- [ ] **Step 7: Commit.**
```
chore: configure Astro 7 project (Cloudflare adapter, Tailwind 4, React, sitemap, wrangler)
```

---

## Task 2: Design-token port and Tailwind 4 theme

**Files:**
- Create: `src/styles/tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `shape.css`, `motion.css`, `light.css`, `base.css` (copied from `docs/design-import/tokens/`, verbatim except `fonts.css` per Step 2)
- Create: `src/styles/global.css`
- Modify: `astro.config.mjs` (add the `fonts` array)

**Interfaces:**
- Consumes: `docs/design-import/tokens/*.css` (source of truth for every value below — read the actual files before writing anything, values here are for cross-checking, not retyping from memory), base `astro.config.mjs` from Task 1.
- Produces (the Tailwind utility surface every later component/page task builds on — copy this `@theme inline` block into `global.css` exactly, it is load-bearing):
```css
@import "tailwindcss";
@import "./tokens/fonts.css";
@import "./tokens/colors.css";
@import "./tokens/typography.css";
@import "./tokens/spacing.css";
@import "./tokens/shape.css";
@import "./tokens/motion.css";
@import "./tokens/light.css";
@import "./tokens/base.css";

@theme inline {
  --color-paper: var(--bg-page);
  --color-surface: var(--bg-surface);
  --color-sunken: var(--bg-sunken);
  --color-inverse: var(--bg-inverse);
  --color-accent: var(--bg-accent);
  --color-accent-bold: var(--bg-accent-bold);
  --color-accent-deep: var(--bg-accent-deep);
  --color-accent-subtle: var(--bg-accent-subtle);
  --color-accent-tint: var(--bg-accent-tint);
  --color-ink-050: var(--ink-050);
  --color-ink-100: var(--ink-100);

  --color-fg: var(--text-primary);
  --color-fg-muted: var(--text-secondary);
  --color-fg-subtle: var(--text-tertiary);
  --color-fg-disabled: var(--text-disabled);
  --color-fg-accent: var(--text-accent);
  --color-fg-on-accent: var(--text-on-accent);
  --color-fg-on-ground: var(--text-on-ground);
  --color-fg-inverse: var(--text-inverse);
  --color-fg-critical: var(--text-critical);

  --color-hairline: var(--border-hairline);
  --color-strong: var(--border-strong);
  --color-focus: var(--border-focus);
  --color-icon: var(--icon-default);
  --color-icon-muted: var(--icon-muted);
  --color-icon-accent: var(--icon-accent);

  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-data: var(--font-data);
  --font-editorial: var(--font-editorial);

  --radius-xs: var(--radius-xs);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-full: var(--radius-full);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --ease-standard: var(--ease-standard);
  --ease-enter: var(--ease-enter);
  --ease-exit: var(--ease-exit);

  --container-shell: 1200px;
  --container-reading: 720px;
}

@theme {
  --text-hero-num: 64px;      --text-hero-num--line-height: 1.0;  --text-hero-num--letter-spacing: -0.035em;
  --text-num-lg: 40px;        --text-num-lg--line-height: 1.05;   --text-num-lg--letter-spacing: -0.03em;
  --text-num-md: 26px;        --text-num-md--line-height: 1.15;   --text-num-md--letter-spacing: -0.02em;
  --text-display-lg: 36px;    --text-display-lg--line-height: 1.08; --text-display-lg--letter-spacing: -0.03em;
  --text-display-md: 28px;    --text-display-md--line-height: 1.15; --text-display-md--letter-spacing: -0.025em;
  --text-title: 22px;         --text-title--line-height: 1.25;    --text-title--letter-spacing: -0.02em;
  --text-headline: 18px;      --text-headline--line-height: 1.35; --text-headline--letter-spacing: -0.012em;
  --text-body-lg: 17px;       --text-body-lg--line-height: 1.55;  --text-body-lg--letter-spacing: -0.006em;
  --text-body: 15px;          --text-body--line-height: 1.55;     --text-body--letter-spacing: -0.004em;
  --text-label: 13px;         --text-label--line-height: 1.4;     --text-label--letter-spacing: 0em;
  --text-caption: 12px;       --text-caption--line-height: 1.4;   --text-caption--letter-spacing: 0.004em;
  --text-micro: 11px;         --text-micro--line-height: 1.3;     --text-micro--letter-spacing: 0.08em;
}

:root {
  --ring-focus: 0 0 0 3px color-mix(in oklab, var(--accent-500) 28%, transparent);
}

@import "./components.css";
```
  This makes `bg-accent`, `text-fg`, `text-fg-muted`, `border-hairline`, `font-display`, `font-data`, `text-title`, `max-w-shell`, `max-w-reading`, `rounded-lg`, `shadow-md`, `ease-standard`, etc. available as Tailwind utilities everywhere from Task 5 onward. `@import "./components.css"` references a file Task 4 creates — leave the import in place even though the file doesn't exist yet; Task 4 creates it before anything imports `global.css` at runtime (Task 13 is the first consumer).

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Copy tokens verbatim.** Copy `docs/design-import/tokens/{colors,typography,spacing,shape,motion,light,base}.css` into `src/styles/tokens/` unchanged, byte-for-byte. Do **not** copy `dark.css` or `category.css` (out of scope, per Global Constraints).
- [ ] **Step 2: Copy and edit `fonts.css`.** Copy `docs/design-import/tokens/fonts.css` into `src/styles/tokens/fonts.css`, then delete only the `@import url("https://fonts.googleapis.com/...")` line at the top (self-hosting replaces the CDN import — Step 4 below). Every `--font-*` role declaration below it is untouched.
- [ ] **Step 3: Write `src/styles/global.css`** exactly per the Produces block above. Import order matters (see spec: `light.css` must come after `colors.css` at equal specificity so its restated accent aliases win).
- [ ] **Step 4: Add the `fonts` config to `astro.config.mjs`.** Import `fontProviders` alongside `defineConfig` from `astro/config`, and add:
```js
fonts: [
  { provider: fontProviders.google(), name: 'Instrument Sans',  cssVariable: '--font-instrument-sans',  weights: ['400 700'], styles: ['normal', 'italic'], subsets: ['latin'] },
  { provider: fontProviders.google(), name: 'Instrument Serif', cssVariable: '--font-instrument-serif', weights: [400],       styles: ['normal', 'italic'], subsets: ['latin'] },
  { provider: fontProviders.google(), name: 'IBM Plex Mono',    cssVariable: '--font-ibm-plex-mono',    weights: [400, 500],  styles: ['normal'],           subsets: ['latin'] },
]
```
  Then update `src/styles/tokens/fonts.css`'s three `--font-sans`/`--font-serif`/`--font-mono` declarations to reference the generated CSS variables (`var(--font-instrument-sans)`, `var(--font-instrument-serif)`, `var(--font-ibm-plex-mono)`) ahead of the existing fallback stacks, keeping the fallback fonts as-is.
- [ ] **Step 5: Verify the theme resolves.** `global.css` won't be imported by anything until Task 13 (`BaseLayout`), so full visual verification happens then. For now, confirm `astro check` still passes and there are no unresolved `@import` paths (the `components.css` import will 404 at CSS-processing time only once something actually imports `global.css` — since nothing does yet, this is not yet observable; Task 4 must land before Task 13).
- [ ] **Step 6: Commit.**
```
feat: port design tokens into a Tailwind 4 theme, self-host fonts
```

---

## Task 3: Inline-SVG icon system

**Files:**
- Create: `src/icons/*.svg` (27 files, see inventory below)
- Create: `src/icons/README.md`
- Create: `src/components/Icon.astro`

**Interfaces:**
- Consumes: `@tabler/icons` devDependency installed in Task 1 (SVGs live at `node_modules/@tabler/icons/icons/outline/{name}.svg`, each a 24×24 viewBox with `stroke="currentColor"` and a `width`/`height` of `24`).
- Produces (consumed by Task 5's `Select.astro`, Task 7's `FeatureCard`/`PlaceholderMedia`, Task 8's header/footer, Task 12's `AppCard`/`PostRow`, Task 15–21's pages):
```astro
---
// src/components/Icon.astro
interface Props { name: string; size?: number; class?: string }
---
```
  Renders a plain inline `<svg>` (no wrapping element, no JS, no font) sized to `size` (default 24) with `currentColor` stroke so `class="text-fg-accent"` etc. on the `Icon` (or an ancestor) controls its color.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Copy the 27 needed SVGs** from `node_modules/@tabler/icons/icons/outline/` into `src/icons/`, named exactly by glyph (`rocket.svg`, `receipt.svg`, etc.) — the full inventory, from spec: `rocket`, `receipt`, `camera`, `chevron-right`, `chevron-down`, `map-pin`, `calendar`, `clock`, `bell`, `wifi-off`, `eye`, `user`, `user-off`, `users`, `users-group`, `pencil`, `arrows-up-down`, `lock`, `mail`, `brand-github`, `circle-check`, `shield-check`, `device-mobile`, `ruler-2`, `message-circle`, `lifebuoy`, `file-text`. Copy the files as-is (don't hand-edit the SVG markup) — each already uses `stroke="currentColor"` and a `24 24` viewBox, which is exactly what `Icon.astro` needs.
- [ ] **Step 2: Write `src/icons/README.md`** recording the source (`@tabler/icons` v3.46.0, MIT License) and that the SVGs are used unmodified except for `width`/`height` attribute overrides applied at render time by `Icon.astro`.
- [ ] **Step 3: Write `Icon.astro`.** Use `import.meta.glob` to eagerly load every icon as a raw string at build time:
```astro
const icons = import.meta.glob<string>('../icons/*.svg', { query: '?raw', import: 'default', eager: true });
```
  Look up the entry keyed by `../icons/${name}.svg`; if it's missing, throw a build-time error naming the requested icon (a typo'd `name` prop should fail the build loudly, not silently render nothing). Override the source SVG's `width`/`height` attributes with the `size` prop (default `24`) and merge in the `class` prop, then emit the raw markup with `set:html` — the glob is build-time only, so the shipped HTML is bare `<svg>...</svg>`, no request, no runtime JS.
- [ ] **Step 4: Smoke-test.** Temporarily render `<Icon name="rocket" size={32} class="text-fg-accent" />` in `src/pages/index.astro` (the stock starter page is still in place — this is just a throwaway check, revert it before committing), run `astro dev --background`, confirm the icon renders inline with no network request in the browser dev tools, then `astro dev stop` and revert the throwaway change.
- [ ] **Step 5: Commit.**
```
feat: add inline-SVG Icon component sourced from @tabler/icons
```

---

## Task 4: Component-layer CSS (the six primitive recipes)

**Files:**
- Create: `src/styles/components.css`

**Interfaces:**
- Consumes: token custom properties from Task 2 (`--bg-accent`, `--space-*`, `--radius-*`, `--control-h-*`, etc. — read `docs/design-import/component-spec.md` in full before writing this file; every declaration below must trace to a line in it).
- Produces (consumed by Task 5's Astro components, which apply these classes and nothing else for cross-cutting states):
```
.e30-btn, .e30-btn--sm, .e30-btn--md, .e30-btn--lg,
.e30-btn--primary, .e30-btn--secondary, .e30-btn--ghost, .e30-btn--critical
.e30-card, .e30-card--subtle, .e30-card--accent, .e30-card--bold, .e30-card--deep, .e30-card--inverse, .e30-card--interactive
.e30-badge, .e30-badge--neutral, .e30-badge--accent, .e30-badge--safe, .e30-badge--tight, .e30-badge--over, .e30-badge--info, .e30-badge--bold
.e30-field
.e30-shot
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `.e30-btn` base + size modifiers.** Base: `inline-flex`, centered content, `gap: var(--space-3)`, `border-radius: var(--radius-md)`, `font-weight: var(--weight-medium)`, `letter-spacing: -0.004em`, `white-space: nowrap`, `transition: transform var(--dur-instant) var(--ease-standard)`. Sizes: `--sm` height `var(--control-h-sm)` padding `0 14px` font `var(--text-label)`; `--md` height `var(--control-h-md)` padding `0 18px` font `var(--text-label)`; `--lg` height `var(--control-h-lg)` padding `0 22px` font `var(--text-body)`.
- [ ] **Step 2: `.e30-btn` variants + interaction states.** `--primary` (default): bg `var(--bg-accent)`, fg `var(--text-on-accent)`, no border; hover → `var(--accent-hover)`; press → `var(--accent-press)`. `--secondary`: bg `var(--bg-surface)`, fg `var(--text-primary)`, border `1px solid var(--border-strong)`; hover bg → `var(--ink-050)`; press → `var(--ink-100)`. `--ghost`: transparent bg, fg `var(--text-primary)`, transparent border; same hover/press fills as secondary. `--critical`: bg `var(--clay-600)`, fg `var(--paper)`; hover → `var(--clay-500)`; press → `var(--clay-700)`. All variants: `:active { transform: scale(var(--press-scale)); }`. `:disabled` (any variant): bg `var(--bg-sunken)`, fg `var(--text-disabled)`, transparent border, `cursor: not-allowed` — disabled state wins over variant colors.
- [ ] **Step 3: `.e30-card` base + tone modifiers.** Base: `border-radius: var(--radius-lg)`, `display: flex; flex-direction: column; gap: var(--space-4)`, `box-shadow: var(--shadow-sm)`, default tone bg `var(--bg-surface)` border `1px solid var(--border-hairline)`. Padding is applied by the Astro component via a Tailwind padding utility per its `padding` prop (`none`→0, `sm`→`var(--space-5)`/16px, `md`→`var(--space-6)`/20px default, `lg`→`var(--space-7)`/24px) — not baked into this CSS class. Tones: `--subtle` bg `var(--bg-sunken)` border hairline, `box-shadow: none`; `--accent` bg `var(--bg-accent-subtle)` border `1px solid var(--accent-200)`; `--bold` bg `var(--bg-accent-bold)` no border, `color: var(--text-on-accent)`; `--deep` bg `var(--bg-accent-deep)` no border, `color: var(--text-on-ground)`; `--inverse` bg `var(--bg-inverse)` no border, `color: var(--text-inverse)`.
- [ ] **Step 4: `.e30-card--interactive`.** Renders as (or is applied to) a real `<a>` in this static site — component-spec's "button-like" description described the design system's React source, not what ships here (Task 5 makes that call). CSS only needs: on hover, `border-color: var(--border-strong)` and `box-shadow: var(--shadow-md)`; no translate/lift.
- [ ] **Step 5: `.e30-badge` base + tones.** Base: `height: 24px`, `padding: 0 var(--space-3)`, `border-radius: var(--radius-full)`, `display: inline-flex; align-items: center; gap: var(--space-2)`, `font-family: var(--font-data)`, `font-size: var(--text-micro)`, `letter-spacing: var(--ls-micro)`, `text-transform: uppercase`, `font-weight: 500`. Tones: `--neutral` bg `var(--ink-100)` fg `var(--text-secondary)`; `--accent` bg `var(--bg-accent-subtle)` fg `var(--text-accent)`; `--safe` bg `var(--green-100)` fg `var(--green-800)`; `--tight` bg `var(--amber-100)` fg `var(--amber-800)`; `--over` bg `var(--clay-100)` fg `var(--clay-800)`; `--info` bg `var(--slate-100)` fg `var(--slate-800)`; `--bold` bg `var(--bg-accent-bold)` fg `var(--text-on-accent)`.
- [ ] **Step 6: `.e30-field`** (shared Input/Select/Textarea box). `height: var(--control-h-md)` (Textarea overrides to `min-height` instead in the component, not here), `padding: 0 var(--space-4)`, `border-radius: var(--radius-md)`, `background: var(--bg-surface)`, `border: 1px solid var(--border-hairline)`, `font-size: var(--text-body)`. `:focus` → `border-color: var(--border-focus)` and `box-shadow: var(--ring-focus)` (the teal-corrected ring from Task 2). `:disabled` → `background: var(--bg-sunken)`. `[aria-invalid="true"]` → `border-color: var(--clay-600)`.
- [ ] **Step 7: `.e30-shot`** (dashed placeholder). `border: 1px dashed var(--border-strong)`, `background: var(--bg-sunken)`.
- [ ] **Step 8: Verify.** `astro check` passes (no Astro file references this yet, so this is purely a CSS-syntax check — open the file and confirm every custom property referenced actually exists in one of the Task 2 token files or `component-spec.md`, since a typo'd var name fails silently in CSS, not at build time).
- [ ] **Step 9: Commit.**
```
feat: add component-layer CSS for the six design-system primitives
```

---

## Task 5: Button, Card, Badge, Input, Textarea, Select components

**Files:**
- Create: `src/components/Button.astro`, `Card.astro`, `Badge.astro`, `Input.astro`, `Textarea.astro`, `Select.astro`

**Interfaces:**
- Consumes: `.e30-btn`/`.e30-card`/`.e30-badge`/`.e30-field` classes (Task 4), `Icon.astro` (Task 3, for Select's chevron).
- Produces (consumed by Task 6 (Wordmark internals don't use these), Task 7, Task 8, Task 12, Task 15–21, Task 23):
```astro
<!-- Button.astro -->
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'critical'; // default 'primary'
  size?: 'sm' | 'md' | 'lg';                                 // default 'md'
  href?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';                      // default 'button', ignored when href is set
}
<!-- Card.astro -->
interface Props {
  tone?: 'default' | 'subtle' | 'accent' | 'bold' | 'deep' | 'inverse'; // default 'default'
  padding?: 'none' | 'sm' | 'md' | 'lg';                                 // default 'md'
  interactive?: boolean;
  href?: string;   // required when interactive is true
}
<!-- Badge.astro -->
interface Props { tone: 'neutral' | 'accent' | 'safe' | 'tight' | 'over' | 'info' | 'bold' }
<!-- Input.astro -->
interface Props {
  label?: string; name: string; type?: string; required?: boolean;
  placeholder?: string; hint?: string; error?: string; maxlength?: number;
}
<!-- Textarea.astro -->
interface Props {
  label?: string; name: string; required?: boolean;
  placeholder?: string; hint?: string; error?: string; maxlength?: number;
}
<!-- Select.astro -->
interface Props {
  label: string; name: string; required?: boolean;
  options: { value: string; label: string }[];
}
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `Button.astro`.** Render `<a class="e30-btn e30-btn--{size} e30-btn--{variant}" href={href}>` when `href` is set, otherwise `<button type={type ?? 'button'} class="...">`. `fullWidth` adds `w-full` (Tailwind utility, not a component-css class — width is layout, not a design-system recipe). Default slot is the label; per spec's Astro-7-deltas note 9, don't wrap it in a `<div>` — a `<span style="display:block">`-equivalent (a plain inline default slot) is correct here since buttons can't legally contain block content.
- [ ] **Step 2: `Card.astro`.** When `interactive` is true, render `<a class="e30-card e30-card--interactive ..." href={href}>` — never a `<button>` with an `onClick`; the canvas's clickable app/post cards must be real links here so crawlers and middle-click both work (spec is explicit on this point). When `interactive` is false/omitted, render a `<div>`. Apply the padding Tailwind utility (`p-0`/`p-4`/`p-5`/`p-6` per the `padding` prop, matching the px values in Task 4 Step 3) and the `e30-card--{tone}` modifier when `tone` isn't `default`.
- [ ] **Step 3: `Badge.astro`.** `<span class={\`e30-badge e30-badge--${tone}\`}><slot /></span>`. Do not add a status→tone mapping here — that mapping is a per-consumer concern (Task 12's `AppCard`, Task 21's changelog page); `Badge` only ever receives an already-resolved `tone`.
- [ ] **Step 4: `Input.astro`.** Wrapper `flex flex-col gap-2`. Optional `label` above the field (`text-label font-medium text-fg`). Field itself: `<input class="e30-field w-full">` with `name`, `type` (default `text`), `required`, `placeholder`, `maxlength` spread through, and `aria-invalid="true"` set when `error` is passed. Optional hint/error line below (`text-caption text-fg-subtle`, or `text-fg-critical` when `error` is set) — render `error` in place of `hint` when both would otherwise show.
- [ ] **Step 5: `Textarea.astro`.** Same wrapper/label/hint pattern as `Input`, but `<textarea class="e30-field w-full min-h-[140px] py-3">` (min-height 120–160px per component-spec, pick 140px as the midpoint; padding `var(--space-3) var(--space-4)` — `.e30-field`'s own `padding: 0 var(--space-4)` needs a `py-3`-equivalent override here since Textarea, unlike Input, isn't a fixed-height single line).
- [ ] **Step 6: `Select.astro`.** `<select class="e30-field w-full appearance-none pr-10">` populated from `options` (`<option value={o.value}>{o.label}</option>`), wrapped in a `relative` container with `<Icon name="chevron-down" size={20} class="text-icon-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />` positioned per component-spec (`appearance: none`, right-aligned 20px muted chevron, `padding-right` reserved for it).
- [ ] **Step 7: Verify** by temporarily rendering one of each in `src/pages/index.astro` (throwaway, revert after) under `astro dev --background`; confirm every variant/tone/size renders with visibly correct color, padding, and radius per `component-spec.md`, then `astro dev stop` and revert.
- [ ] **Step 8: Commit.**
```
feat: add Button, Card, Badge, Input, Textarea, Select components
```

---

## Task 6: Wordmark, Monogram, and favicon

**Files:**
- Create: `src/components/Wordmark.astro`, `Monogram.astro`
- Modify: `public/favicon.svg` (full rewrite)
- Delete: `public/favicon.ico`

**Interfaces:**
- Consumes: token colors from Task 2 (`--text-accent`, `--accent-300`, `--bg-accent`, `--text-on-accent`, `--font-display`).
- Produces (consumed by Task 8's `SiteHeader`/`SiteFooter`, Task 13's `BaseLayout` head link):
```astro
<!-- Wordmark.astro -->
interface Props { size?: number; tone?: 'default' | 'light' }  // default size 20, tone 'default'
<!-- Monogram.astro -->
interface Props { size?: number }  // default 28
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `Wordmark.astro`.** Render "Eleven" + "30" in `font-display`, `letter-spacing: -0.028em` (`-0.016em` when `size < 18`), with the two words set close together (7px gap, 5px when `size < 18`). Font weight: "Eleven" is 400 at `size >= 18`, else 500; "30" is 700 at `size >= 18`, else 800. Overall text color is `text-fg` (or `text-fg-inverse`/`--paper` when `tone="light"`); the "30" span is colored `text-fg-accent` normally, or `text-[color:var(--accent-300)]` when `tone="light"` (a light accent on the dark footer). `font-size: {size}px` on the wrapper.
- [ ] **Step 2: `Monogram.astro`.** A `{size}px` square with `border-radius: {0.24 * size}px`, `background: var(--bg-accent)`, containing "30" centered, `color: var(--text-on-accent)`, `font-family: var(--font-display)`, `font-size: {0.62 * size}px`, `font-weight: 800`, `letter-spacing: -0.03em`.
- [ ] **Step 3: Rebuild `public/favicon.svg`.** Hand-write a static SVG (not the Astro component — favicons can't run Astro) matching `Monogram`'s recipe at a fixed size, e.g. `viewBox="0 0 64 64"`: a squircle `rect` with `rx="15.36"` (0.24 × 64) filled `#176683` (the resolved teal `--bg-accent`, per spec's "Resolved teal values" table), and a white "30" text element roughly `font-size="40"` (0.62 × 64), `font-weight="800"`, `letter-spacing="-0.03em"`, centered. Use a system sans-serif `font-family` fallback stack in the SVG (Instrument Sans isn't loadable inside a static favicon SVG in most browsers) — visual fidelity here is "close enough for a 16–32px tab icon," not pixel-exact type matching.
- [ ] **Step 4: Delete `public/favicon.ico`** — no `<link rel="icon" href="/favicon.ico">` will exist once `BaseLayout` (Task 13) replaces the starter's `<head>`; a second, now-unreferenced icon file is dead weight.
- [ ] **Step 5: Verify** by opening `public/favicon.svg` directly in a browser tab (or an SVG viewer) and confirming it reads as a legible teal squircle with a white "30".
- [ ] **Step 6: Commit.**
```
feat: add Wordmark and Monogram components, replace favicon with the Monogram mark
```

---

## Task 7: Recurring layout patterns — Section, PlaceholderMedia, FeatureCard, DefinitionRow

**Files:**
- Create: `src/components/Section.astro`, `PlaceholderMedia.astro`, `FeatureCard.astro`, `DefinitionRow.astro`

**Interfaces:**
- Consumes: Tailwind theme utilities from Task 2 (`max-w-shell`, `max-w-reading`, `bg-sunken`, `bg-accent-deep`, etc.), `Icon.astro` (Task 3), `.e30-shot` (Task 4).
- Produces (consumed by Task 8, Task 12, Task 15–21):
```astro
<!-- Section.astro -->
interface Props {
  tone?: 'paper' | 'sunken' | 'deep' | 'bold' | 'inverse'; // default 'paper'
  width?: 'shell' | 'reading';                               // default 'shell'
  pad?: string;  // raw Tailwind vertical-padding classes, e.g. "py-24"; default "py-20"
}
<!-- PlaceholderMedia.astro -->
interface Props {
  icon: string; caption: string; dimensions: string; // e.g. "1290 × 2796"
  aspect: string;   // CSS aspect-ratio value, e.g. "9 / 17"
  radius?: string;  // default "30px"
  onDark?: boolean; // translucent-white variant for use on a dark Section
}
<!-- FeatureCard.astro -->
interface Props { icon: string; title: string; body: string }
<!-- DefinitionRow.astro -->
interface Props { label: string }  // default slot is the row body
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `Section.astro`.** Outer element carries the full-bleed background per `tone` (`paper`→`bg-paper`, `sunken`→`bg-sunken` plus `border-y border-hairline`, `deep`→`bg-accent-deep text-fg-on-ground`, `bold`→`bg-accent-bold text-fg-on-accent`, `inverse`→`bg-inverse text-fg-inverse`) and the vertical padding from `pad` (default `py-20`, i.e. 80px, matching the canvas's most common section padding). Inner wrapper: `max-w-{shell|reading} mx-auto px-8` (32px horizontal padding, matching the canvas's `padding: 0 32px` inner rows). Default slot renders inside the inner wrapper.
- [ ] **Step 2: `PlaceholderMedia.astro`.** `<div class="e30-shot flex flex-col items-center justify-center gap-2.5 text-center" style={\`border-radius: ${radius ?? '30px'}; aspect-ratio: ${aspect};\`}>` containing `<Icon name={icon} size={24} class={onDark ? 'opacity-60' : 'text-icon-muted'} />` and a caption line (`font-data text-caption`, `{caption}<br />{dimensions}`, `text-fg-subtle` normally or `opacity-70` white text when `onDark`). When `onDark`, override the `.e30-shot` background/border to the translucent-white variant (`background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.25)`) via an inline style or a `--shot-on-dark` modifier — pick whichever reads more cleanly against the existing `.e30-shot` CSS from Task 4, but don't touch `.e30-shot` itself (it's shared by every non-dark placeholder on the site).
- [ ] **Step 3: `FeatureCard.astro`.** Wraps `Card` (padding `lg` or `md` — the canvas uses `lg` for `launchSteps`/`principles`/`services` and `md` for `launchFacts`/`tipFeatures`; expose no prop for this, the four call sites in Tasks 18/20/21 choose by wrapping `FeatureCard` in their own `Card`-padding context — **actually simplify**: have `FeatureCard` itself accept the padding implicitly by always wrapping a `Card` with `padding="lg"`, and for the two `md`-padding use sites (`launchFacts`, `tipFeatures`), those call sites render `Card` directly instead of `FeatureCard` with the same icon/title/body markup inline). Content: `<Icon name={icon} size={20|24} class="text-icon-accent" />`, `<div class="text-headline font-medium">{title}</div>`, `<p class="text-fg-muted">{body}</p>`.
- [ ] **Step 4: `DefinitionRow.astro`.** `<div class="grid gap-6 items-baseline" style="grid-template-columns: 150px minmax(0,1fr)">` with `<span class="font-data text-micro uppercase tracking-[var(--ls-micro)] text-fg-accent">{label}</span>` and `<span><slot /></span>`.
- [ ] **Step 5: Verify** by temporarily composing one of each inside `src/pages/index.astro` (throwaway), confirming visually under `astro dev --background`, then reverting.
- [ ] **Step 6: Commit.**
```
feat: add Section, PlaceholderMedia, FeatureCard, DefinitionRow layout components
```

---

## Task 8: SiteHeader and SiteFooter

**Files:**
- Create: `src/components/SiteHeader.astro`, `SiteFooter.astro`

**Interfaces:**
- Consumes: `Wordmark`, `Monogram` (Task 6), `Button` (Task 5), `Astro.url.pathname`.
- Produces (consumed by Task 13's `BaseLayout`): both are prop-less — `<SiteHeader />` / `<SiteFooter />`.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `SiteHeader.astro` structure.** `position: sticky; top: 0; z-index: 20`, background `color-mix(in srgb, var(--paper) 88%, transparent)` with `backdrop-filter: blur(12px)`, `border-bottom: 1px solid var(--border-hairline)`. Inner row: `max-w-shell mx-auto px-8 h-16 flex items-center justify-between gap-8`. Left: an `<a href="/">` containing `<Monogram size={28} />` + `<Wordmark size={20} />` side by side (10px gap) — a real link, not a button with an onClick (this is a static site).
- [ ] **Step 2: Nav with active-state underline.** Five items, each a real `<a>`:
```
{ label: 'Apps',       href: '/apps/',    activeWhen: (path) => path.startsWith('/apps/') }
{ label: 'Blog',       href: '/blog/',    activeWhen: (path) => path.startsWith('/blog/') }
{ label: 'About',      href: '/about/',   activeWhen: (path) => path === '/about/' || path === '/now/' }
{ label: 'Consulting', href: '/consulting/', activeWhen: (path) => path.startsWith('/consulting/') }
{ label: 'Support',    href: '/contact/', activeWhen: (path) => path.startsWith('/contact/') }
```
  Compute `active` from `Astro.url.pathname` at render time. Each nav link is `position: relative`, and when active renders a `2px` `bg-accent` bar spanning `left-3 right-3 bottom-0` (matching the canvas's underline). After the nav, include a small `<Button size="sm" href="/apps/launch-window/">Join the beta</Button>` — the canvas's header CTA (`eleven30-site.dc.html:51`); it's the one nav element that isn't in the spec's component table, included here because it's part of the header the spec cites as its source (`Header 35–54`).
- [ ] **Step 3: `SiteFooter.astro` structure.** `bg-inverse text-fg-inverse`. Four-column grid: wordmark+blurb column (`<Wordmark size={22} tone="light" />` + the two paragraphs of italicized/opacity-reduced blurb text from the canvas, `eleven30-site.dc.html:628–629`), then three link columns exactly as resolved by the spec/DECISIONS:
```
Apps:     Launch Window (/apps/launch-window/), Rachel's Tip Calculator (/apps/rachels-tip-calculator/), Release notes (/changelog/)
Eleven30: About (/about/), Now (/now/), Blog (/blog/), Consulting (/consulting/)
Help:     Support (/contact/), App privacy (/apps/), Home (/)
```
  Bottom bar: `© 2026 Eleven30` and `eleven30.xyz`, `border-top: 1px solid rgba(255,255,255,0.12)`.
- [ ] **Step 4: Verify** under `astro dev --background`: nav underline appears only under the matching item when you manually navigate `Astro.url` (test by temporarily rendering `<SiteHeader />`/`<SiteFooter />` in `index.astro`, throwaway, revert after); confirm `/about/` and `/now/` both light up "About".
- [ ] **Step 5: Commit.**
```
feat: add SiteHeader and SiteFooter with active-nav-state logic
```

---

## Task 9: Content collections schema and site config

**Files:**
- Create: `src/content.config.ts`
- Create: `src/config/site.ts`

**Interfaces:**
- Consumes: nothing new (Astro/Zod APIs only).
- Produces (consumed by every task from Task 10 onward that touches content):
```ts
// src/content.config.ts
export const collections: { blog: ...; apps: ...; policies: ... };
// schemas: blog{title,description(≤160),pubDate,updatedDate?,tags[](default []),draft(default false)}
// apps{name,tagline,description,platforms[ios|android|web](nonempty),status[development|beta|released],
//      appStoreUrl?(url),playStoreUrl?(url),icon,screenshots[](default []),accentColor?,order(default 0)}
// policies{appSlug,effectiveDate,lastUpdated,dataCollected[](REQUIRED, no default),
//          thirdParties[{name,purpose,policyUrl(url)}](default []),childrenPolicy(default false)}

// src/config/site.ts
export const SITE = {
  name: 'Eleven30', domain: 'eleven30.xyz', url: 'https://eleven30.xyz',
  tagline: 'Independent software · Florida',
  description: 'Small apps, built by one person, finished properly.',
  contactEmail: 'hello@eleven30.xyz', replyWindow: 'Within 2 business days',
  location: 'Florida, United States',
  author: { name: '[Your name]', github: 'github.com/[handle]' },
} as const;
```

**Model:** haiku

**Steps:**
- [ ] **Step 1: Write `src/content.config.ts`** exactly per the spec's "Content model" section — `defineCollection` from `astro:content`, `glob` from `astro/loaders`, `z` from `astro/zod` (never `astro:content`'s `z`). Loader pattern is `'**/[^_]*.md'` for all three collections (excludes underscore-prefixed drafts — additive to the `draft` flag, not a replacement). `dataCollected` has **no** `.default([])` — it must be a required field so a new app's policy can't accidentally omit it.
- [ ] **Step 2: Write `src/config/site.ts`** exactly as in Produces above, `as const`.
- [ ] **Step 3: Verify.** `astro check` passes with no content files yet existing (an empty collection is valid). Confirm `z.url()` and `z.email()`-style calls are used, never `.string().url()`.
- [ ] **Step 4: Commit.**
```
feat: add blog/apps/policies content collections and site config
```

---

## Task 10: Build-time invariant and blog helpers

**Files:**
- Create: `src/lib/collections.ts`
- Create: `src/lib/blog.ts`

**Interfaces:**
- Consumes: `astro:content`'s `getCollection`, `getEntry`, `CollectionEntry` types; collections from Task 9.
- Produces (consumed by Task 16's apps index, Task 17/19's app/privacy routes, Task 12's `AppCard`, Task 15/20/24's blog-reading routes):
```ts
// src/lib/collections.ts
export type AppEntry = CollectionEntry<'apps'>;
export type PolicyEntry = CollectionEntry<'policies'>;
export async function getApps(): Promise<AppEntry[]>;                    // order asc, then name
export async function getPolicyForApp(app: AppEntry): Promise<PolicyEntry>;
export async function assertPolicyCoverage(): Promise<void>;

// src/lib/blog.ts
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]>;  // draft !== true, pubDate desc
export function readingTime(body: string): string;                              // "N min read", 200wpm, min 1
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `getApps()`.** `getCollection('apps')`, sort by `order` ascending, tie-break by `name` ascending (`getCollection()` order is explicitly non-deterministic per Astro's docs — never rely on filesystem order).
- [ ] **Step 2: `getPolicyForApp(app)`.** Look up the policy whose collection `id` equals `app.id` via `getEntry('policies', app.id)`. If it doesn't exist, throw exactly:
  `` `App "${app.id}" (src/content/apps/${app.id}.md) has no policy at src/content/policies/${app.id}.md` ``
  If it exists but its `data.appSlug` doesn't equal its own `id`, throw exactly:
  `` `Policy src/content/policies/${policy.id}.md declares appSlug "${policy.data.appSlug}" but its filename id is "${policy.id}"` ``
  (both error strings are load-bearing — brief §9/spec require "a file path in the error", and Task 25's negative-build checks will grep for these paths).
- [ ] **Step 3: `assertPolicyCoverage()`.** Calls `getApps()` and, for every app, `getPolicyForApp(app)` (surfacing the same two error shapes). Additionally catches the reverse case: `getCollection('policies')` entries whose `id` has no matching app in `getApps()` — throw a similar file-path-bearing error for that direction too (e.g. `` `Policy src/content/policies/${policy.id}.md has no matching app at src/content/apps/${policy.id}.md` ``). This function is called from `/apps/index.astro` (Task 16), which always builds regardless of which app page is being generated — that's what catches an orphaned policy file that no `getStaticPaths` ever iterates.
- [ ] **Step 4: `getPublishedPosts()`.** `getCollection('blog', (entry) => entry.data.draft !== true)`, sorted by `data.pubDate` descending. This must be the *only* function any route calls to read the blog collection — do not call `getCollection('blog')` directly anywhere else in the codebase from this point forward.
- [ ] **Step 5: `readingTime(body)`.** Split on whitespace, count words, `Math.max(1, Math.round(words / 200))` minutes, return `` `${n} min read` ``.
- [ ] **Step 6: Verify** with a throwaway temporary blog/app/policy fixture (create one minimal `.md` file per collection in a scratch location outside `src/content/`, or write a tiny standalone Node script that imports nothing from Astro but exercises the string-formatting logic in isolation) that the two `getPolicyForApp` error strings match exactly — this is easiest to fully verify once Task 11's real seed content exists and Task 19's route runs `getStaticPaths`, so a lighter unit check here (confirm the functions compile and the sort/filter logic reads correctly) is acceptable; full behavioral verification happens in Task 25's negative-build checks.
- [ ] **Step 7: Commit.**
```
feat: add policy-coverage invariant and blog collection helpers
```

---

## Task 11: Seed content — apps, policies, one blog post

**Files:**
- Create: `src/content/apps/launch-window.md`
- Create: `src/content/apps/rachels-tip-calculator.md`
- Create: `src/content/policies/launch-window.md`
- Create: `src/content/policies/rachels-tip-calculator.md`
- Create: `src/content/blog/my-first-post.md`

**Interfaces:**
- Consumes: schemas from Task 9; `getPolicyForApp`/`assertPolicyCoverage` from Task 10 (this content is what makes both pass).
- Produces: the five Markdown files every remaining content-reading task (12, 15–20) renders.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `apps/launch-window.md`.** Frontmatter: `name: Launch Window`, `platforms: [ios, android]`, `status: development`, `icon: rocket`, `order: 1`, no `appStoreUrl`/`playStoreUrl` (none exist). `tagline` and `description` adapt `APPS[0].pitch`/`longPitch` from the canvas script block (`eleven30-site.dc.html:660–661`) — keep the "Working name only" caveat from `longPitch` somewhere in the body/description, since decision 3 requires the name-not-final signal to persist. Body: a short paragraph or two of body copy is optional here (the bespoke marketing body lives in Task 18's `LaunchWindowBody.astro`, not in this Markdown file's rendered content) — this file's `body` can be minimal/empty since `[app].astro` (Task 17) doesn't render `apps` collection bodies at all, only its frontmatter fields.
- [ ] **Step 2: `apps/rachels-tip-calculator.md`.** Frontmatter: `name: Rachel's Tip Calculator` (plain ASCII apostrophe, never `&#39;`), `platforms: [ios]`, `status: released`, `icon: receipt`, `order: 2`, no `appStoreUrl` (open question — none exists yet, leave unset rather than inventing one). `tagline`/`description` adapt `APPS[1].pitch`/`longPitch` (`eleven30-site.dc.html:673–674`).
- [ ] **Step 3: `policies/rachels-tip-calculator.md`** (short "no data collected" style). Frontmatter: `appSlug: rachels-tip-calculator`, `effectiveDate`/`lastUpdated` both `2026-08-28` (full ISO with offset, e.g. `2026-08-28T00:00:00-04:00`), `dataCollected: []`, `thirdParties: []`, `childrenPolicy: false`. Body sections, adapting `privacySections` (`eleven30-site.dc.html:847–855`) per the spec's split table: **What I collect** (yes), **no Location section** (the app has no location feature), **no Launch data section**, **Analytics and ads** (yes, plus "nothing leaves the phone" language from `tipFeatures`), **Deleting your data** (yes), **Children** (yes), **Changes and contact** (yes, ending *without* a literal email address — `PolicyLayout`, built in Task 13, renders the address block from `SITE.contactEmail`). End the body with the disclaimer verbatim from the canvas (`618`): *"This page is a design placeholder written in plain language, not reviewed legal copy. Have a lawyer check it before you submit to the app stores."* — actually confirm in Task 13 whether the disclaimer is rendered by `PolicyLayout` itself (recommended, matching the contact-block treatment) or lives in this body; if `PolicyLayout` already renders it, omit it here to avoid duplication.
- [ ] **Step 4: `policies/launch-window.md`.** Frontmatter: `appSlug: launch-window`, same dates, `dataCollected: []`, `thirdParties: []`, `childrenPolicy: false`. Body sections per the table: **What I collect** (yes, same base language), **Location** (yes — on-device only, sorts launch sites, estimates visibility, not stored server-side, declinable — adapt `privacySections[1]`), **Launch data** (yes — public schedules, estimates change — adapt `privacySections[2]`), **Analytics and ads** (yes), **Deleting your data** (yes), **Children** (yes), **Changes and contact** (yes, no literal address). Same closing disclaimer treatment as Step 3.
- [ ] **Step 5: `blog/my-first-post.md`.** Frontmatter: `title: "Counting down to a moving target"`, `description` from `POSTS[0].dek` (`eleven30-site.dc.html:684`, must be ≤160 chars), `pubDate: 2026-08-28T09:00:00-04:00` (full ISO with offset, per brief §7 — a bare date is wrong here), `tags: ['build log']`, `draft: false`. Body: `<!-- Placeholder post — replace or delete. -->` comment at the very top, then the `BODY` paragraphs (`699–703`), the pull-quote *"Half the launches I've seen, I saw by accident."* as a Markdown blockquote, then the `BODY2` paragraphs (`705–708`).
- [ ] **Step 6: Verify the invariant holds.** `astro check && astro build` succeeds with both apps' policies present. Temporarily rename `src/content/policies/launch-window.md` to something else, confirm `astro build` now fails with an error string containing `src/content/apps/launch-window.md` (Task 10's error format), then rename it back.
- [ ] **Step 7: Commit.**
```
feat: seed apps, policies, and one blog post
```

---

## Task 12: AppCard and PostRow

**Files:**
- Create: `src/components/AppCard.astro`, `src/components/PostRow.astro`

**Interfaces:**
- Consumes: `Card`, `Badge`, `Icon` (Tasks 5, 3); `AppEntry` type from `src/lib/collections.ts` (Task 10); `CollectionEntry<'blog'>` from `astro:content`.
- Produces (consumed by Task 15's home page, Task 16's apps index, Task 20's blog index):
```astro
<!-- AppCard.astro -->
interface Props { app: AppEntry; layout: 'grid' | 'row' }
<!-- PostRow.astro -->
interface Props { post: CollectionEntry<'blog'>; dense?: boolean }
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Status→Badge tone mapping** (shared by `AppCard`, needed nowhere else): `released` → `safe`, `development` | `beta` → `info`. Render the badge label as the human status text (`"On the App Store"` for released, `"In development"` for development, `"Beta"` for beta) — not the raw enum value.
- [ ] **Step 2: `AppCard` `layout="grid"`** (home page, canvas `87–101`): a `Card interactive padding="lg" href={`/apps/${app.id}/`}`. Header row: a 46×46px `.e30-shot` tile with the app's `Icon` centered (20px, muted), the app name (`text-title font-display font-semibold`), and the status `Badge`, `justify-between`. Below: `tagline` (`text-fg-muted`, `max-w-[44ch]`). Footer row (`margin-top: auto`): platform text · price text, joined by a literal `·` character rendered as its own `<span>` with a flex `gap` — per Astro 7's `compressHTML: 'jsx'` default, do not rely on a literal space between adjacent inline spans (spec's Astro-7-deltas item 8). Since `apps` schema has no `price` field, render `platforms.join(' · ')` and the `status`-derived label in its place, or omit the price segment entirely if no equivalent field exists — check `apps` schema (Task 9) before inventing a value.
- [ ] **Step 3: `AppCard` `layout="row"`** (`/apps/`, canvas `177–194`): same `Card interactive` wrapper, but a `grid` with columns `88px minmax(0,1fr) auto` — an 88×88px icon tile, then name+badge+tagline+platform-line stacked, then a trailing `chevron-right` `Icon`.
- [ ] **Step 4: `PostRow.astro`.** `dense` (home page, canvas `116–122`): `<a href={`/blog/${post.id}/`}>` grid `118px minmax(0,1fr)`, date in the first column (`font-data text-caption text-fg-subtle`, formatted as e.g. `28 Aug 2026` — write a small local date formatter, don't add a dependency), title (`text-headline font-medium`) + dek (`description`, `text-fg-muted`) in the second. Full (`/blog/`, canvas `367–377`): grid `150px minmax(0,1fr)`, first column adds a category/tag line above the date (`tags[0]`, uppercase micro, `text-fg-accent`) — actually check canvas: it's date then tag stacked in column one, title+dek+"N min read" (via `readingTime(post.body)`) stacked in column two.
- [ ] **Step 5: Verify** with the seed content from Task 11 by temporarily rendering `<AppCard app={apps[0]} layout="grid" />` etc. in `index.astro` (throwaway), confirming the real Launch Window/Rachel's Tip Calculator data renders correctly, then reverting.
- [ ] **Step 6: Commit.**
```
feat: add AppCard and PostRow collection-driven components
```

---

## Task 13: BaseLayout, PostLayout, PolicyLayout, Prose

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `PostLayout.astro`, `PolicyLayout.astro`
- Create: `src/components/Prose.astro`

**Interfaces:**
- Consumes: `src/styles/global.css` (Task 2), `SiteHeader`/`SiteFooter` (Task 8), `SITE` (Task 9), `readingTime` (Task 10), `astro:assets`'s `Font`, `astro:content`'s `render`.
- Produces (consumed by every page task, 15–24):
```astro
<!-- BaseLayout.astro -->
interface Props {
  title: string; description: string; path: string;   // path used for canonical + og:url, e.g. "/apps/launch-window/"
  ogType?: string;                                       // default 'website'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
<!-- PostLayout.astro -->
interface Props { post: CollectionEntry<'blog'> }
<!-- PolicyLayout.astro -->
interface Props { policy: PolicyEntry; app: AppEntry }
<!-- Prose.astro -->
<!-- no props; default slot wraps rendered Markdown Content -->
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `BaseLayout.astro` head.** `<html lang="en" data-theme="light" data-accent="teal">` — both attributes on `<html>` together, so `light.css`'s `[data-theme="light"][data-accent]` block matches. `<head>`: charset, viewport, `<title>{title}</title>`, `<meta name="description" content={description}>`, canonical `<link rel="canonical" href={new URL(path, Astro.site)}>`, `og:title`/`og:description`/`og:url`/`og:type` (default `website`)/`og:site_name` (`SITE.name`), `twitter:card` `summary`, `<link rel="sitemap" href="/sitemap-index.xml">`, `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`, `<link rel="icon" href="/favicon.svg">`, and three `<Font cssVariable="--font-instrument-sans" preload />` / `<Font cssVariable="--font-instrument-serif" />` / `<Font cssVariable="--font-ibm-plex-mono" />` tags imported from `astro:assets` (only the first is `preload`). Import `../styles/global.css` at the top of the frontmatter.
- [ ] **Step 2: JSON-LD rendering.** When `jsonLd` is passed, render `<script type="application/ld+json" set:html={ld}>` where `ld = JSON.stringify(jsonLd).replace(/</g, '\\u003c')` — `set:html` does not escape, so this replacement is what prevents a future `</script>`-containing description from breaking out of the tag. Do not use `<Fragment set:html>` or any path that re-escapes the already-computed string.
- [ ] **Step 3: Body.** `<body>` wraps `<SiteHeader />`, `<main><slot /></main>`, `<SiteFooter />`. `Astro.generator` is not needed (that was the starter's placeholder meta tag — drop it, it's not in the spec's head-contents list).
- [ ] **Step 4: `Prose.astro`.** Hand-written (not `@tailwindcss/typography`) styles for `h2`, `p`, `ul`, `blockquote`, `a` matching the post/policy type scale from canvas `393–403` and `606–617`: body paragraphs `text-body-lg leading-[1.7] max-w-[64ch]`, `h2` `text-title font-display font-semibold mt-10 mb-3`, blockquote `border-l-2 border-[color:var(--border-accent)] pl-6 font-editorial text-[26px] leading-[1.35]`, links inherit the global `a` styling from `base.css` (no override needed). Wraps a default slot (the rendered `<Content />`).
- [ ] **Step 5: `PostLayout.astro`.** Internally calls `const { Content } = await render(post)` (top-level `await` in an `.astro` frontmatter is valid). Renders via `BaseLayout` with `title={post.data.title}`, `description={post.data.description}`, `path={`/blog/${post.id}/`}`, `ogType="article"`, and a `BlogPosting` `jsonLd` object (`headline`, `datePublished`, `dateModified` from `updatedDate ?? pubDate`, `author` from `SITE.author.name`, `mainEntityOfPage` the canonical URL). Post header: back-link to `/blog/`, date/`readingTime(post.body)`/tag meta row (separators as their own flex-gapped `<span>`s, not literal spaces — Astro-7-deltas item 8), `<h1>{post.data.title}</h1>`, dek (`post.data.description`), hairline rule, `<Prose><Content /></Prose>`, then the author block (`[Your name]` placeholder photo circle + "About me →" link) and a "Next post" `Button`.
- [ ] **Step 6: `PolicyLayout.astro`.** Internally calls `const { Content } = await render(policy)`. Renders via `BaseLayout` with `title={`${app.data.name} — Privacy Policy`}`, `description` a short fixed sentence (not from frontmatter — policies have no `description` field), `path={`/apps/${app.id}/privacy/`}`. Header: "Legal" eyebrow, `<h1>Privacy policy</h1>`, a "Last updated {lastUpdated}" caption line naming `app.data.name`. Body: `<Prose><Content /></Prose>`. After the body, render the contact block from `SITE.contactEmail` (not from the Markdown) and the fixed disclaimer sentence *"This page is a design placeholder written in plain language, not reviewed legal copy. Have a lawyer check it before you submit to the app stores."* hardcoded once in this layout — confirms and resolves Task 11 Step 3/4's open note: the disclaimer is layout-owned, identical on both policies by construction, not authored per-file.
- [ ] **Step 7: Verify** by temporarily rendering `<BaseLayout title="Test" description="Test" path="/">Hello</BaseLayout>` in `index.astro` (throwaway) under `astro dev --background`: confirm the header/footer render with real teal styling (tokens resolving correctly end-to-end for the first time), fonts load, canonical/OG tags appear in view-source, then revert and `astro dev stop`.
- [ ] **Step 8: Commit.**
```
feat: add BaseLayout, PostLayout, PolicyLayout, and Prose
```

---

## Task 14: Static page data modules

**Files:**
- Create: `src/data/now.ts`, `principles.ts`, `services.ts`, `faqs.ts`, `releases.ts`, `elsewhere.ts`

**Interfaces:**
- Consumes: nothing (pure data, transcribed from the canvas's `renderVals()` script block, `eleven30-site.dc.html:720–882`).
- Produces (consumed by Task 15's home page and Task 21's About/Now/Consulting/Changelog pages):
```ts
// now.ts
export interface NowItem { icon: string; text: string }
export const nowItems: readonly NowItem[];       // 4 short items, home card
export interface NowLongItem { label: string; text: string }
export const nowLong: readonly NowLongItem[];    // 5 items, /now/
export const nowUpdated: string;                  // "28 Aug 2026"

// principles.ts
export interface Principle { icon: string; title: string; body: string }
export const principles: readonly Principle[];    // 3 items

// services.ts
export interface Service { icon: string; title: string; body: string }
export const services: readonly Service[];        // 3 items

// faqs.ts
export interface Faq { q: string; a: string }
export const faqs: readonly Faq[];                // 6 items

// releases.ts
export interface Release { date: string; app: string; version: string; upcoming?: boolean; items: readonly string[] }
export const releases: readonly Release[];        // 4 items, renamed per decision 3

// elsewhere.ts
export interface ElsewhereLink { icon: string; label: string }
export const elsewhere: readonly ElsewhereLink[]; // 3 items
```

**Model:** haiku

**Steps:**
- [ ] **Step 1: Transcribe `nowItems`/`nowLong`/`nowUpdated`** from `eleven30-site.dc.html:788–801` and `:475` (`"Now · updated 28 Aug 2026"` → `nowUpdated = '28 Aug 2026'`) verbatim, mapping `ti ti-rocket` style icon classes to bare glyph names (`rocket`, not `ti ti-rocket`) matching Task 3's icon filenames.
- [ ] **Step 2: Transcribe `principles`** from `:809–813`, `services` from `:815–819`, `faqs` from `:821–828` — verbatim text, bare icon names.
- [ ] **Step 3: Transcribe `releases`** from `:836–845`, renaming per decision 3: `"Tip Calculator"` → `"Rachel's Tip Calculator"` (plain ASCII apostrophe), `"Launch Countdown"` → `"Launch Window"`.
- [ ] **Step 4: Transcribe `elsewhere`** from `:803–807` verbatim, including the literal `github.com/[handle]` placeholder — do not fill it in.
- [ ] **Step 5: Verify.** `astro check` passes (plain `.ts` modules, no Astro-specific syntax to get wrong).
- [ ] **Step 6: Commit.**
```
feat: add typed data modules for the non-collection pages
```

---

## Task 15: Home page

**Files:**
- Modify: `src/pages/index.astro` (full rewrite, replacing the stock starter page)

**Interfaces:**
- Consumes: `BaseLayout` (13), `Section`, `PlaceholderMedia`, `Icon` (7, 3), `AppCard layout="grid"`, `PostRow dense` (12), `Card`, `Button` (5), `getApps` (10), `getPublishedPosts` (10), `nowItems` (14), `SITE` (9).
- Produces: the `/` route. No other task consumes this file directly.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Hero section** (canvas `61–77`). Eyebrow `SITE.tagline`, `<h1>` "Small apps, built by one person, finished properly.", the intro paragraph (canvas `66`), two CTAs (`Button size="lg" href="/apps/"` "See the apps", `Button size="lg" variant="secondary" href="/about/"` "About me"), and a `PlaceholderMedia icon="rocket" caption="Countdown screen" dimensions="1290 × 2796" aspect="9 / 17" radius="30px"`.
- [ ] **Step 2: "The apps" section** (canvas `79–105`), `Section tone="sunken"`. Heading + "All apps →" link to `/apps/`. Grid of `AppCard layout="grid"` for every entry from `getApps()` — do not hardcode the two apps; iterate the collection so adding a third app needs no code change here (brief §1's core promise).
- [ ] **Step 3: "Recent writing" + Now/Consulting sidebar** (canvas `107–146`). Left column: heading + "All posts →" to `/blog/`, then `PostRow dense` for `(await getPublishedPosts()).slice(0, 3)`. Right column: a `Card padding="lg"` titled "Now" listing `nowItems` (icon + text rows) with a "The full now page →" link to `/now/`, and a `Card tone="accent" padding="lg"` with the consulting blurb (canvas `141`) and a `Button variant="secondary" href="/consulting/"` "How I work with teams".
- [ ] **Step 4: About band** (canvas `148–163`), `Section tone="deep"`. Eyebrow "About", the pull-quote paragraph (`font-editorial`, canvas `152`), two CTAs (`Button variant="secondary" href="/about/"` "More about me", `Button variant="ghost" href="/contact/"` "Get in touch"), and a `PlaceholderMedia icon="camera" caption="Photo — desk / workspace" dimensions="1600 × 1200" aspect="4 / 3" onDark`.
- [ ] **Step 5: `BaseLayout` props.** `title="Eleven30"`, `description={SITE.description}`, `path="/"`, `jsonLd` a `WebSite` object (`name`, `url`, `description` from `SITE`).
- [ ] **Step 6: Verify.** `astro dev --background`, load `/`, confirm both seed apps render from the collection (not hardcoded), the three most-recent published posts show (only one exists, confirm it doesn't crash on fewer than 3), then `astro dev stop`.
- [ ] **Step 7: Commit.**
```
feat: build the home page
```

---

## Task 16: Apps index page

**Files:**
- Create: `src/pages/apps/index.astro`

**Interfaces:**
- Consumes: `BaseLayout` (13), `Section` (7), `AppCard layout="row"` (12), `getApps`, `assertPolicyCoverage` (10).
- Produces: the `/apps/` route.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Call `await assertPolicyCoverage()`** at the top of the frontmatter, before anything else — this route always builds (it's not behind any dynamic param), which is what makes it the place that catches an orphaned policy file (one whose app was deleted) that `getStaticPaths`-driven routes would never visit.
- [ ] **Step 2: Page body** (canvas `168–198`). `Section` with eyebrow "Apps", `<h1>` "Everything I've shipped, and what's in testing.", intro paragraph (canvas `173`), then a `flex flex-col gap-5` list of `AppCard layout="row"` for every `getApps()` entry.
- [ ] **Step 3: `BaseLayout` props.** `title="Apps — Eleven30"`, `description` a short fixed sentence, `path="/apps/"`.
- [ ] **Step 4: Verify.** `astro build` succeeds and both apps render in `order` sequence (Launch Window first, `order: 1`).
- [ ] **Step 5: Commit.**
```
feat: build the apps index page
```

---

## Task 17: App landing page — shared shell and body registry

**Files:**
- Create: `src/pages/apps/[app].astro`
- Create: `src/components/apps/index.ts`

**Interfaces:**
- Consumes: `BaseLayout` (13), `Button`, `Badge`, `Icon` (5, 3), `Section`, `PlaceholderMedia` (7), `getApps` (10).
- Produces (consumed by Task 18, which populates the registry, and by this same file):
```ts
// src/components/apps/index.ts
export type AppBodyComponent = (...args: any[]) => any;  // local alias — Astro doesn't export a stable
                                                             // public type for "a .astro component reference"
export const APP_BODIES: Record<string, AppBodyComponent | undefined> = {};
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `getStaticPaths`.** `const apps = await getApps(); return apps.map((app) => ({ params: { app: app.id }, props: { app } }));` — params must be strings (Astro 6 requirement); `app.id` already is one.
- [ ] **Step 2: Shared shell markup**, built entirely from `app.data` (never per-app hardcoded copy) — back-link to `/apps/`, icon tile with `<Icon name={app.data.icon} />`, `app.data.name`, a status `Badge` (reuse the mapping from Task 12 Step 1 — consider exporting it from `AppCard.astro` or duplicating the three-line mapping here; duplicating a 3-line mapping across two files is a defensible call for a Model=sonnet task, but note it either way), `app.data.tagline`, `app.data.description`, CTAs (a primary "Download"/"Join the beta" `Button` — for `released` apps with an `appStoreUrl`, link to it; otherwise a disabled-looking or waitlist-style CTA is acceptable per Open Question 2 in the spec, which explicitly flags this as unresolved — do not fabricate a store URL), and platform/status caption line. Below the shared shell, an `appLinks` `Card`: "Privacy policy" → `/apps/${app.id}/privacy/`, "Support" → `/contact/`, "Release notes" → `/changelog/` (canvas `876–880`).
- [ ] **Step 3: Body registry lookup.** `import { APP_BODIES } from '../../components/apps'; const Body = APP_BODIES[app.id];` — render `Body && <Body app={app} />` after the shared shell. With the registry empty (this task), every app renders the shared shell alone; Task 18 populates two entries.
- [ ] **Step 4: `src/components/apps/index.ts`.** Exactly the Produces block above — an empty, correctly-typed `APP_BODIES` map. Do not import any body component here yet.
- [ ] **Step 5: `BaseLayout` props.** `title={app.data.name + ' — Eleven30'}`, `description={app.data.tagline}`, `path={`/apps/${app.id}/`}`, `jsonLd` a `SoftwareApplication` object (`name`, `applicationCategory`, `operatingSystem` derived from `platforms`, `offers` only when `appStoreUrl` or `playStoreUrl` exists).
- [ ] **Step 6: Verify.** `astro build` produces `/apps/launch-window/index.html` and `/apps/rachels-tip-calculator/index.html`, both rendering the shared shell (no marketing body yet — that's expected until Task 18).
- [ ] **Step 7: Commit.**
```
feat: build the shared app landing page shell and body registry
```

---

## Task 18: Launch Window and Rachel's Tip Calculator marketing bodies

**Files:**
- Create: `src/components/apps/LaunchWindowBody.astro`
- Create: `src/components/apps/RachelsTipCalculatorBody.astro`
- Modify: `src/components/apps/index.ts` (populate `APP_BODIES`)

**Interfaces:**
- Consumes: `AppEntry` type (10), `Section`, `FeatureCard`, `PlaceholderMedia`, `Card`, `Icon` (7, 5, 3), `APP_BODIES` shape from Task 17.
- Produces: both components accept `{ app: AppEntry }` and are registered as `APP_BODIES['launch-window']` / `APP_BODIES['rachels-tip-calculator']` — consumed only by Task 17's `[app].astro` (already wired; this task just fills in the map).

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `LaunchWindowBody.astro` — countdown band** (canvas `228–241`), `Section tone="deep"`. Eyebrow "Next launch · Cape Canaveral", four static figures (`02 days`, `11 hours`, `30 minutes`, `44 seconds`) rendered as **typography, not a live timer** (per spec's routing section — no `setInterval`, this is a marketing screenshot of the product): each a `flex flex-col` with the number at `text-hero-num font-display font-semibold` and the unit label at `text-micro uppercase opacity-60`. Closing paragraph (canvas `239`).
- [ ] **Step 2: "How it works" steps** (canvas `243–258`). Three `FeatureCard`-style cards (use `Card padding="lg"`, since these also contain a `PlaceholderMedia` above the icon/title/body that plain `FeatureCard` doesn't support) for `launchSteps`: `PlaceholderMedia` (9:16, radius `var(--radius-lg)`/14px) with the step's shot caption, then "Step {n}" eyebrow, title, body — content from `eleven30-site.dc.html:769–771`.
- [ ] **Step 3: "Built for people who look up" + facts grid** (canvas `260–278`). Two-column: prose on the left (canvas `265`), a 2×2 grid of `Card padding="md"` (icon + title + body, `text-label` body size) on the right for `launchFacts` (`:774–778`).
- [ ] **Step 4: "What it doesn't do" + app-links card** (canvas `280–304`) — this duplicates the shared shell's `appLinks` card built in Task 17; skip re-rendering it here and only add the `Card tone="accent"` "What it doesn't do" list (the four bullet points, canvas `285–288`) plus the "Launch times come from public launch schedules..." caption. Keep the `Name not final` `Badge tone="info"` visible somewhere in this body or confirm it's already present in the shared shell from Task 17 (decision 3 requires it to persist on this app's own page one way or the other — don't render it twice).
- [ ] **Step 5: `RachelsTipCalculatorBody.astro`.** Just the `tipFeatures` grid (canvas `338–346`): `Card padding="md"` per feature (`:781–785`) in an `auto-fit minmax(210px,1fr)` grid. This app's hero/CTA/links are fully covered by the shared shell — this body component is intentionally the smaller of the two, matching the canvas's own two-section vs. five-section asymmetry.
- [ ] **Step 6: Populate the registry.**
```ts
import LaunchWindowBody from './LaunchWindowBody.astro';
import RachelsTipCalculatorBody from './RachelsTipCalculatorBody.astro';
export const APP_BODIES: Record<string, AppBodyComponent | undefined> = {
  'launch-window': LaunchWindowBody,
  'rachels-tip-calculator': RachelsTipCalculatorBody,
};
```
- [ ] **Step 7: Verify.** `astro build`; view both app pages, confirm Launch Window shows the countdown band/steps/facts/doesn't-do list below the shared shell, and Rachel's Tip Calculator shows the features grid.
- [ ] **Step 8: Commit.**
```
feat: add Launch Window and Rachel's Tip Calculator marketing bodies
```

---

## Task 19: Privacy policy route

**Files:**
- Create: `src/pages/apps/[app]/privacy.astro`

**Interfaces:**
- Consumes: `PolicyLayout` (13), `getApps`, `getPolicyForApp` (10).
- Produces: `/apps/{slug}/privacy/` routes. This is the file whose `getStaticPaths` structurally enforces the build-time invariant.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `getStaticPaths`.** `const apps = await getApps(); return Promise.all(apps.map(async (app) => ({ params: { app: app.id }, props: { app, policy: await getPolicyForApp(app) } })));` — this is the structural half of the invariant: any app lacking a policy throws here, during the build, for every environment (dev and prod both run `getStaticPaths`).
- [ ] **Step 2: Render.** `<PolicyLayout policy={policy} app={app} />` — no other markup in this file; all header/contact-block/disclaimer/Prose rendering is `PolicyLayout`'s job (Task 13).
- [ ] **Step 3: Verify — positive case.** `astro build` produces `/apps/launch-window/privacy/index.html` and `/apps/rachels-tip-calculator/privacy/index.html`, each rendering that app's distinct policy body and `SITE.contactEmail`.
- [ ] **Step 4: Verify — negative case.** Repeat Task 11 Step 6's manual check here specifically: rename `src/content/policies/launch-window.md`, run `astro build`, confirm it fails with the error naming `src/content/apps/launch-window.md` and `src/content/policies/launch-window.md`, then rename the file back and confirm the build succeeds again.
- [ ] **Step 5: Commit.**
```
feat: build per-app privacy policy route
```

---

## Task 20: Blog index and post pages

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[...slug].astro`

**Interfaces:**
- Consumes: `BaseLayout`/`PostLayout` (13), `PostRow` (full, not dense) (12), `getPublishedPosts` (10).
- Produces: `/blog/` and `/blog/{slug}/` routes.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `blog/index.astro`** (canvas `360–381`). `Section width="reading"` (or the canvas's own 900px — check whether `reading` (720px) is too narrow for the two-column `150px | 1fr` post rows; if so, use a bespoke `max-w-[900px]` container instead of `Section`'s `width` prop rather than stretching `Section`'s two fixed widths to fit a third measurement). Eyebrow "Blog", `<h1>` "Notes on building it.", intro paragraph, then `PostRow` (not `dense`) for every `getPublishedPosts()` entry, in a `border-t border-hairline` list.
- [ ] **Step 2: `blog/[...slug].astro`.** `getStaticPaths`: `const posts = await getPublishedPosts(); return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));` (route param comes from `post.id`, never `post.slug` — that property doesn't exist in Astro 7). Render `<PostLayout post={post} />`.
- [ ] **Step 3: `BaseLayout` props for the index.** `title="Blog — Eleven30"`, `description` a short fixed sentence, `path="/blog/"`.
- [ ] **Step 4: Verify.** `astro build`; `/blog/` lists the one seed post; `/blog/my-first-post/` renders it via `PostLayout` with correct reading time and JSON-LD (view-source, confirm `BlogPosting` type and no `&#39;`/`&amp;#` anywhere near the post title, which has no apostrophe in this case — re-verify against Rachel's Tip Calculator's name elsewhere on the same page, e.g. in the footer, since that name does have one).
- [ ] **Step 5: Commit.**
```
feat: build blog index and post pages
```

---

## Task 21: About, Now, Consulting, Changelog pages

**Files:**
- Create: `src/pages/about.astro`, `now.astro`, `consulting.astro`, `changelog.astro`

**Interfaces:**
- Consumes: `BaseLayout` (13), `Section`, `FeatureCard`, `DefinitionRow`, `PlaceholderMedia` (7), `Card`, `Badge`, `Button` (5), `principles`/`services`/`nowItems`(unused here)/`nowLong`/`nowUpdated`/`releases`/`elsewhere` (14).
- Produces: `/about/`, `/now/`, `/consulting/`, `/changelog/` routes.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `about.astro`** (canvas `418–470`). Hero: eyebrow "About", `<h1>I'm [your name] — a solo developer in Florida, 25 years in.</h1>` (literal placeholder, per decision 7 — do not fill in `SITE.author.name`'s bracketed value here, render it as the H1 text directly since the canvas embeds it in the headline, not just the byline), the four body paragraphs (canvas `426–429`), two CTAs (`Button href="/consulting/"` "Work with me", `Button variant="secondary" href="/now/"` "What I'm doing now"). Sidebar: `PlaceholderMedia icon="user" caption="Portrait" dimensions="1200 × 1500" aspect="4 / 5"`, then a `Card` "Elsewhere" list from `elsewhere` data (icon + label rows, including the literal `github.com/[handle]`). Second `Section tone="sunken"`: "How I work" heading + `FeatureCard` grid from `principles`.
- [ ] **Step 2: `now.astro`** (canvas `473–487`). `Section width="reading"`-ish (check against the canvas's 760px — same judgment call as Task 20 Step 1: use a bespoke width if `reading`'s 720px reads as meaningfully different). Eyebrow `` `Now · updated ${nowUpdated}` ``, `<h1>What I'm working on right now.</h1>`, intro paragraph, then a `border-t` list of `DefinitionRow label={n.label}` for every `nowLong` entry.
- [ ] **Step 3: `consulting.astro`** (canvas `490–520`). Hero: eyebrow "Consulting", `<h1>One client at a time. I ship the thing, then hand you the keys.</h1>`, intro paragraph, `FeatureCard` grid from `services`. CTA band: `Section tone="bold"`, "Currently taking one project for Q1." heading + paragraph, `Button size="lg" variant="secondary" href="/contact/"` "Start a conversation".
- [ ] **Step 4: `changelog.astro`** (canvas `565–594`). `Section width` per the canvas's 780px (same judgment call as above). Eyebrow "Release notes", `<h1>What changed, and when.</h1>`, intro, then for each `releases` entry: a `grid 150px|1fr` row — date + a `Badge tone="neutral"` carrying the app name (per spec: the canvas's `Tag` component isn't in `component-spec.md`, so it becomes a `neutral` Badge, not a new primitive) in the left column; version number + (when `upcoming`) a `Badge tone="info"` "Coming soon", then a bulleted `items` list, in the right column.
- [ ] **Step 5: `BaseLayout` props for all four** — distinct `title`/`description`/`path` per page (`/about/`, `/now/`, `/consulting/`, `/changelog/`); no `jsonLd` needed on any of these (spec's JSON-LD-per-page-type list only covers `WebSite`/`BlogPosting`/`SoftwareApplication`).
- [ ] **Step 6: Verify.** `astro build`; visually check all four routes under `astro dev --background`, confirm the `github.com/[handle]` and `[your name]` placeholders render literally (not blank, not filled in), then `astro dev stop`.
- [ ] **Step 7: Commit.**
```
feat: build About, Now, Consulting, and Changelog pages
```

---

## Task 22: Contact API endpoint

**Files:**
- Create: `src/pages/api/contact.ts`
- Create: `src/lib/env.ts` (the `requireEnv` helper)

**Interfaces:**
- Consumes: `astro/zod`'s `z`; `cloudflare:workers`'s `env`; `APIRoute` type from `astro`.
- Produces (the exact contract Task 23's `ContactForm.tsx` must send/expect — do not diverge from this shape in either task):
```ts
export const prerender = false;
export const POST: APIRoute = async ({ request }) => { /* Response */ };
export const ALL: APIRoute = () => Response;  // 405, Allow: POST, for any non-POST method
```
Request body (`application/json`):
```ts
{
  name: string;        // 1–80 chars, trimmed
  email: string;        // z.email(), ≤254 chars
  message: string;      // 1–5000 chars, trimmed
  app?: 'launch-window' | 'rachels-tip-calculator' | 'other';  // optional
  website?: string;     // honeypot — normally empty/absent
  'cf-turnstile-response': string;
}
```
Responses: `200 {"ok":true}` · `400 {"ok":false,"error":"invalid"}` (malformed JSON body **or** Zod failure — both are input-shape problems, use the same error string for both since the spec doesn't distinguish them) · `403 {"ok":false,"error":"challenge_failed"}` (missing or failed Turnstile token) · `500 {"ok":false,"error":"send_failed"}` (Resend returned non-2xx) · `500 {"ok":false,"error":"server_error"}` (a required secret is missing — this string isn't pinned by the spec, but it must be distinct from `send_failed` since a missing secret is a deploy-configuration problem, not a Resend-side failure) · `405` with `Allow: POST` header (non-POST method, empty body).

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `requireEnv` helper (`src/lib/env.ts`).** Given a key name, read it from `cloudflare:workers`'s `env`; if missing/empty, `console.error` a message naming the missing key server-side and signal the caller to return the `server_error` 500 (return `undefined`/`null` from the helper and have `contact.ts` check for that, or throw a typed error `contact.ts` catches — either is fine, but `contact.ts` must never let a missing-secret `TypeError` bubble up as an unhandled 500 with no log line).
- [ ] **Step 2: `ALL` export.** `() => new Response(null, { status: 405, headers: { Allow: 'POST' } })` — Astro routes an unmatched-method request to `ALL` only when there's no more specific handler for that method; confirm this is in fact how Astro dispatches (check the endpoints doc if unsure) rather than assuming.
- [ ] **Step 3: `POST` handler, in order.** (a) Parse the JSON body; a parse failure returns `400 {"ok":false,"error":"invalid"}` immediately. (b) Honeypot: if `body.website` is a non-empty string, return `200 {"ok":true}` and do nothing else (no Turnstile call, no Zod validation, no Resend call — silent discard). (c) Turnstile: if `body['cf-turnstile-response']` is missing, short-circuit to `403 {"ok":false,"error":"challenge_failed"}` without any network call; otherwise `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` form-encoded with `secret` (from `requireEnv('TURNSTILE_SECRET_KEY')`), `response` (the token), `remoteip` (from the `CF-Connecting-IP` request header) — a non-`success` result returns the same `403`. (d) Zod-validate the payload per the shape above; failure → `400 {"ok":false,"error":"invalid"}` with no field-level detail in the response. (e) `POST https://api.resend.com/emails`, `Authorization: Bearer ${requireEnv('RESEND_API_KEY')}`, JSON body `{ from: 'Eleven30 site <noreply@eleven30.xyz>', to: [requireEnv('CONTACT_TO_EMAIL')], subject: <derive from name/app>, text: <plain-text body built from name/email/app/message>, reply_to: email }` — `text`, never `html`. Non-2xx → `console.error` the status and response body server-side, return `500 {"ok":false,"error":"send_failed"}`. (f) `200 {"ok":true}`. At no point does any response include `name`, `email`, `message`, or `app` from the request.
- [ ] **Step 4: Verify with `astro preview`** (real `workerd`, not `astro dev`) and a local `.dev.vars` (gitignored, created for this test only) containing `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (always-passes test secret) and dummy `RESEND_API_KEY`/`CONTACT_TO_EMAIL` values: `GET /api/contact` → `405` with `Allow: POST`; `POST` with `website: "spam"` filled → `200`, and confirm (e.g. via a temporarily-invalid `RESEND_API_KEY` that would 500 if actually called) that no Resend call happened; `POST` with no `cf-turnstile-response` → `403`; swap the secret to the always-fails test value `2x0000000000000000000000000000000AA` and submit a real token → `403`; a 6000-character `message` → `400`.
- [ ] **Step 5: Commit.**
```
feat: add POST /api/contact with honeypot, Turnstile, and Resend
```

---

## Task 23: Contact form island and contact page

**Files:**
- Create: `src/components/ContactForm.tsx`
- Create: `src/pages/contact.astro`

**Interfaces:**
- Consumes: the exact request/response contract from Task 22; `Input`, `Textarea`, `Select`, `Button`, `Card` (5); `BaseLayout`, `Section` (13, 7); `getApps` (10); `faqs`, contacts data (reuse `SITE.contactEmail`/`SITE.replyWindow`/`SITE.location` instead of a separate `contacts` data module, since these three values already live in `src/config/site.ts` from Task 9).
- Produces: the `/contact/` route. This is the only page on the site with a `client:load` directive.
```tsx
// ContactForm.tsx
interface Props {
  siteKey: string;                                   // resolved PUBLIC_TURNSTILE_SITE_KEY (or test-key fallback), computed by contact.astro
  appOptions: { value: string; label: string }[];     // must stay in sync with api/contact.ts's app enum: launch-window | rachels-tip-calculator | other
}
```

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `contact.astro` — resolve the Turnstile site key.** In frontmatter: `const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';` and `if (!import.meta.env.PUBLIC_TURNSTILE_SITE_KEY) console.warn('PUBLIC_TURNSTILE_SITE_KEY is not set — falling back to the Turnstile always-passes test key.')` — this runs at build time (Astro inlines `import.meta.env` values then), so the warning surfaces in build logs, not in the browser.
- [ ] **Step 2: `contact.astro` — static content.** `Section` with eyebrow "Support", `<h1>Something not working? Write to me.</h1>`, intro (canvas `528`, adjust "2 business days" to read from `SITE.replyWindow`). Two-column: FAQ `Card`s from `faqs` data (Task 14) on the left; on the right, mount `<ContactForm client:load siteKey={siteKey} appOptions={[...(await getApps()).map(a => ({ value: a.id, label: a.data.name })), { value: 'other', label: 'Something else' }]} />` inside a `Card padding="lg"`, followed by the static contact-info rows (`SITE.contactEmail`, `SITE.replyWindow`, `SITE.location` — reusing the `contacts`-style icon+label+value row layout from the canvas, `:830–834`, built inline here rather than as a shared component since it's used in exactly one place).
- [ ] **Step 3: Load the Turnstile script once**, in `contact.astro`'s template (not inside the React island): `<script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>` — exactly that URL, per Cloudflare's requirement that it never be proxied or cached.
- [ ] **Step 4: `ContactForm.tsx` — fields.** Controlled inputs for `name` (`Input`, required, maxLength 80), `email` (`Input type="email"`, required, maxLength 254), `app` (`Select`, optional, `appOptions` plus no forced default/blank option needed since it's optional), `message` (`Textarea`, required, maxLength 5000), and a visually-hidden honeypot `website` field: wrap it in a container styled to be invisible and unreachable (off-screen positioning or zero size — avoid `display:none`/`visibility:hidden`, which some spam bots skip filling precisely because screen readers and simple bots both detect them; an off-screen-positioned but rendered input is the standard honeypot pattern), `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden="true"`.
- [ ] **Step 5: Turnstile explicit rendering.** On mount (`useEffect`), poll for `window.turnstile` (the script may still be loading) and once available, call `window.turnstile.render(containerRef.current, { sitekey: siteKey, callback: (token) => setToken(token) })`, storing the returned widget ID. Disable the submit button until `token` is set.
- [ ] **Step 6: Submit flow.** On submit: client-side courtesy checks (`required` attributes, `type="email"`, `maxLength`s already on the inputs are sufficient — don't duplicate Zod logic in JS), set state to `pending` (button disabled, label "Sending…"), `POST` `application/json` to `/api/contact` with all fields including `website` and `'cf-turnstile-response': token`. On any non-2xx response: call `window.turnstile.reset(widgetId)`, clear `token` from state (a spent token is single-use and would otherwise produce `timeout-or-duplicate` on retry), and show a failure message. On `200`: show a success message and reset the form fields (but the success/failure message text must never echo back what the user typed — a generic "Thanks — I'll get back to you within..." / "Something went wrong, please try again or email ... directly" is correct).
- [ ] **Step 7: Verify** with `astro preview` and `.dev.vars` set to the Turnstile test sitekey/secret pair: load `/contact/`, confirm the Turnstile widget renders (it will show its own "success" checkmark automatically with the test sitekey), submit a valid form, confirm a success message with no submitted content visible in the response or DOM; then edit `.dev.vars` to the always-fails secret, resubmit, confirm a failure message and that a second submission attempt doesn't silently reuse the same (now-reset) token.
- [ ] **Step 8: Commit.**
```
feat: add contact form island and /contact/ page
```

---

## Task 24: Feed, sitemap, robots.txt, 404 page

**Files:**
- Create: `src/pages/rss.xml.ts`
- Create: `public/robots.txt`
- Create: `src/pages/404.astro`
- Modify: `astro.config.mjs` (add `filter` to the `sitemap()` call)

**Interfaces:**
- Consumes: `getPublishedPosts` (10), `@astrojs/rss`'s `rss()`, `BaseLayout`/`Section` (13, 7).
- Produces: `/rss.xml`, `/404` (→ `dist/404.html`), `public/robots.txt`, and the sitemap's exclusion of `/api/contact`.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: `rss.xml.ts`.** `import rss from '@astrojs/rss'; import { getPublishedPosts } from '../lib/blog';` — `export async function GET(context) { const posts = await getPublishedPosts(); return rss({ title: SITE.name, description: SITE.description, site: context.site, items: posts.map((post) => ({ title: post.data.title, pubDate: post.data.pubDate, description: post.data.description, link: `/blog/${post.id}/` })), customData: '<language>en-us</language>' }); }`. No full-content `<item>` bodies (per spec — would need `markdown-it` + `sanitize-html`, out of scope).
- [ ] **Step 2: `public/robots.txt`** exactly:
```
User-agent: *
Allow: /

Sitemap: https://eleven30.xyz/sitemap-index.xml
```
- [ ] **Step 3: Exclude `/api/contact` from the sitemap.** In `astro.config.mjs`, change `sitemap()` to `sitemap({ filter: (page) => !page.includes('/api/') })` (or an equivalent explicit exclusion of the `/api/contact` URL — confirm the `filter` callback receives full URLs, per `@astrojs/sitemap`'s docs, before assuming the substring check is sufficient).
- [ ] **Step 4: `404.astro`.** A short "not found" page using `Section` — heading, one sentence, a `Button href="/"` back home. `BaseLayout` `title="Page not found — Eleven30"`, `path="/404/"` (the canonical doesn't need to be meaningful here, but must still be a valid URL). No `getStaticPaths` — Astro special-cases `src/pages/404.astro` to build to `dist/404.html` directly even under `build.format: 'directory'`.
- [ ] **Step 5: Verify.** `astro build`; confirm `dist/rss.xml` exists and is valid XML excluding no drafts (there are none in the seed content, so this only confirms structure); confirm `dist/404.html` exists (not `dist/404/index.html`); confirm `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist and the sitemap does not list any `/api/` URL; confirm `dist/robots.txt`'s `Sitemap:` line is the absolute `sitemap-index.xml` URL.
- [ ] **Step 6: Commit.**
```
feat: add RSS feed, robots.txt, sitemap exclusion, and 404 page
```

---

## Task 25: Build-output verification script

**Files:**
- Create: `scripts/verify-build.mjs`

**Interfaces:**
- Consumes: the built `dist/` directory (this script runs after `npm run build`, per its `npm run verify` wiring already added in Task 1).
- Produces: a Node script with a non-zero exit code on any failed assertion, consumed only by the `npm run verify` script and by Task 26's final check.

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Route existence.** For each of `/`, `/blog/`, `/blog/my-first-post/`, `/apps/`, `/apps/launch-window/`, `/apps/launch-window/privacy/`, `/apps/rachels-tip-calculator/`, `/apps/rachels-tip-calculator/privacy/`, `/contact/`, `/about/`, `/now/`, `/consulting/`, `/changelog/`, assert `dist/<path>/index.html` exists (strip the leading/trailing slash appropriately when building the filesystem path).
- [ ] **Step 2: Non-page-route existence.** Assert `dist/rss.xml`, `dist/404.html`, `dist/sitemap-index.xml`, `dist/robots.txt` all exist.
- [ ] **Step 3: `robots.txt` content.** Assert `dist/robots.txt` contains the literal string `https://eleven30.xyz/sitemap-index.xml`.
- [ ] **Step 4: Zero-JS check.** Walk every `dist/**/index.html` **except** `dist/contact/index.html`, and assert none contains a `<script type="module"` substring. (`dist/contact/index.html` is expected to contain one — the React island's hydration script — so it's explicitly excluded from this check, not merely "the one exception you'd need to explain if it failed.")
- [ ] **Step 5: Apostrophe-escaping check.** Walk every `dist/**/*.html` and assert none contains the literal substrings `&#39;` or `&amp;#` (the escaping trap from spec/brief §1 — Rachel's Tip Calculator's name appears on multiple pages and must render as a literal `'`, never a pre-escaped entity).
- [ ] **Step 6: Wire up exit behavior.** Collect all failures (don't stop at the first one — a single run should report everything wrong at once), print each with the specific path/string that failed, and `process.exit(1)` if any failed, `process.exit(0)` otherwise.
- [ ] **Step 7: Verify the verifier.** Run `npm run build && npm run verify` — it should pass cleanly against the site built by Tasks 1–24. Then deliberately break one check (e.g. temporarily rename `dist/robots.txt` after a build) and confirm `npm run verify` reports it and exits non-zero, then restore.
- [ ] **Step 8: Commit.**
```
feat: add post-build verification script
```

---

## Task 26: Final verification

**Files:** none (verification only).

**Model:** sonnet

**Steps:**
- [ ] **Step 1: Clean build from scratch.** `rm -rf node_modules dist && npm install && npm run build`. Expected: succeeds with no errors (this is brief §9's first acceptance item, and Task 1's `"build": "astro check && astro build"` script means a type error anywhere in the codebase fails this step too).
- [ ] **Step 2: Run the verifier.** `npm run verify`. Expected: exits 0 with no reported failures.
- [ ] **Step 3: Negative build checks — app without a policy.** `mv src/content/policies/launch-window.md /tmp/` (or scratchpad), `npm run build`. Expected: build fails, and the error output names `src/content/apps/launch-window.md` and `src/content/policies/launch-window.md` (Task 10's exact error string). Restore the file, rebuild, confirm success again.
- [ ] **Step 4: Negative build checks — malformed frontmatter.** Temporarily delete the `pubDate` line from `src/content/blog/my-first-post.md`, `npm run build`. Expected: fails, naming that file. Restore, rebuild, confirm success.
- [ ] **Step 5: Negative build checks — wrong-typed field.** Temporarily set `dataCollected: "not an array"` in one policy file, `npm run build`. Expected: fails with a Zod type error naming that file. Restore, rebuild, confirm success.
- [ ] **Step 6: Endpoint checks against `astro preview`.** With a local `.dev.vars` (gitignored) holding the Turnstile always-passes secret and dummy `RESEND_API_KEY`/`CONTACT_TO_EMAIL`: run `astro preview` in the background, then via `curl`: `GET /api/contact` → `405` with `Allow: POST`; honeypot-filled `POST` → `200`, confirm no outbound Resend call (point `RESEND_API_KEY` at an invalid value for this one run and confirm it still returns `200`, proving Resend was never reached); missing-token `POST` → `403`; always-fails-secret `POST` with a real token → `403`; 6000-char message → `400`. Stop the preview server afterward.
- [ ] **Step 7: Record what cannot be verified in this environment.** Lighthouse ≥95 on `/`, `/blog/my-first-post/`, `/apps/launch-window/`; layout at 375px width; keyboard focus visibility (teal ring); end-to-end Resend mail delivery — all require either a browser or live DNS/Resend domain verification that doesn't exist in this environment. Note these explicitly as outstanding for the author's manual sign-off per the spec's own Verification section — do not attempt to fake-pass them.

---

## Self-Review

**Spec coverage** (spec's Scope §In, mapped to the task that delivers it):
- Astro 7 project configuration (adapter, integrations, trailing slash, fonts) → Tasks 1, 2.
- Design-token port with `@theme inline` preserving `[data-accent]` → Task 2.
- Six primitives + Icon + page shell/header/footer/recurring patterns → Tasks 3–8, 13.
- Three content collections + build-time invariant (both directions) → Tasks 9, 10, seed-content-driven verification in 11, 16, 19, final negative checks in 26.
- Every brief §5 route + About/Now/Consulting/Changelog/404/robots/sitemap → Tasks 15, 16, 17, 18, 19, 20, 21, 24.
- Contact island (`client:load`) + `POST /api/contact` per brief §6's exact sequence → Tasks 22, 23.
- `wrangler.jsonc`, `.nvmrc`, post-build verification script → Tasks 1, 25.
- Out-of-scope items (dark mode, category tokens, real assets, MDX, rate limiting, About/Now/Consulting/Changelog collection, analytics, `astro:env`) are never introduced by any task — enforced via Global Constraints, not a task of their own.

**Interface consistency:**
- `AppEntry`/`PolicyEntry`/`getApps`/`getPolicyForApp`/`assertPolicyCoverage` (Task 10) are typed identically everywhere they're consumed (Tasks 12, 16, 17, 18, 19).
- `getPublishedPosts`/`readingTime` (Task 10) signatures match their use in Tasks 12, 13, 15, 20, 24.
- `APP_BODIES: Record<string, AppBodyComponent | undefined>` is declared once in Task 17 and only ever added-to (never redeclared with a different shape) in Task 18.
- The `POST /api/contact` request/response contract is stated identically in Task 22 (producer) and Task 23 (consumer), including the exact error strings and the `app` enum values, which must also match `appOptions` built from `getApps()` in Task 23 Step 2.
- `BaseLayout`/`PostLayout`/`PolicyLayout` props (Task 13) are used with exactly those shapes in every page task (15–21, 24).

**Vagueness scan / judgment calls flagged explicitly rather than left silently ambiguous:**
- Task 7 Step 3 and Task 20/21's `Section` `width` for pages whose canvas measurement (760/780/900px) doesn't match either `shell` (1200px) or `reading` (720px) exactly — flagged as an explicit implementer choice (bespoke max-width vs. reusing `reading`) rather than silently picking one.
- Task 13 Step 6 / Task 11 Steps 3–4 resolve where the privacy disclaimer text lives (layout-owned, not per-file) — stated once, explicitly, so it isn't duplicated or omitted.
- Task 17 Step 2's status→Badge mapping duplication (vs. Task 12's) is called out as a deliberate, acceptable small duplication rather than an oversight.
- Task 22's `500 server_error` response shape is flagged as the implementer's own addition (not spec-pinned) alongside the reasoning for why it must differ from `send_failed`.
- Task 17 Step 2's app-page CTA behavior for an app with no store URL is pinned to "don't fabricate a URL" and pointed at the spec's own open question, rather than leaving the implementer to guess silently.

