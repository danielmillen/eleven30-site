# Personal Site — Build Brief

Agent-facing specification. Read this fully before writing code.

---

## 0. Version drift warning

This brief was written September 2026. **Target Astro 7** — the current release is
v7.2.10. Install with `npm create astro@latest` and pin the resolved version in
`package.json` rather than assuming a version number from this document.

Astro shipped v6 and v7 after most models' training data was collected, so an
agent working from memory will produce v5-era code that looks plausible and is
wrong. **Read these before writing any Astro code:**

- Content collections reference: `docs.astro.build/en/guides/content-collections/`
- v7 upgrade guide: `docs.astro.build/en/guides/upgrade-to/v7/`
- v6 upgrade guide: `docs.astro.build/en/guides/upgrade-to/v6/`

The v6 and v7 guides matter even for a greenfield build, because they enumerate
what changed from the v5 API that training data will reach for by default.

Also verify before implementing:

- **Tailwind 4** — CSS-first configuration via `@import "tailwindcss"` and
  `@theme` in a stylesheet. There is no `tailwind.config.js` by default. Astro
  wires it through the Vite plugin, not the old integration.
- **Cloudflare Workers Static Assets** — this replaces the Pages deployment model.
  Config is `wrangler.jsonc` with an `[assets]` block.

If a code sample in this brief conflicts with current documentation, the
documentation wins. Do not invent package names or API surfaces — if you cannot
confirm something exists, stop and flag it.

---

## 1. Scope

Visual design is specified separately. This document covers structure, data
modelling, and constraints only. Where the two disagree about anything visual,
the design wins.

Four capabilities: blog, app landing pages, per-app privacy policies, contact form.

**Apps in scope: Launch Window and Rachel's Tip Calculator.** Do not create
content, routes, or navigation entries for any other app. The collection
structure below is built for N apps so that adding one is a content change rather
than a code change.

Slugs are `launch-window` and `rachels-tip-calculator`. Note the display name
contains an apostrophe — it must survive HTML escaping in `<title>`, meta
descriptions, Open Graph tags, and JSON-LD without turning into `&#39;` in
rendered text or breaking a quoted attribute. The slug drops it entirely.

### Non-goals — do not build these

- No user accounts, login, sessions, or per-user data. There is no database.
- No CMS, admin panel, or content API.
- No SSR for content pages. Everything except one endpoint is prerendered.
- No analytics beyond what Cloudflare provides for free, unless asked.
- No e-commerce, newsletter signup, or comments.

If a task seems to require any of the above, it is out of scope. Flag it instead
of building it.

---

## 2. Stack

| Layer | Choice | Why (do not substitute) |
|---|---|---|
| Framework | Astro 7 (latest) | Content-first, ships zero JS by default, typed content collections |
| Styling | Tailwind 4 | Matches the utility-on-element model; no cascade archaeology |
| Interactivity | React islands | Only where genuinely needed; author is a React/React Native dev |
| Hosting | Cloudflare Workers (Static Assets) | Free static serving, git-connected builds, room to grow |
| Adapter | `@astrojs/cloudflare` | Lets the one dynamic route run on the same Worker |
| Form email | Resend (or equivalent) | Single API call, no SMTP |
| Spam | Cloudflare Turnstile | Free, same vendor, no CAPTCHA puzzle for users |
| Registrar/DNS | Cloudflare | Already in use |

**Astro renders static by default.** Only `src/pages/api/contact.ts` opts out with
`export const prerender = false`. Do not set the whole project to server output.

Additional integrations: `@astrojs/rss`, `@astrojs/sitemap`, `@astrojs/mdx` (only
if a post actually needs components inline).

---

## 3. Repository layout

```
.
├── astro.config.mjs
├── wrangler.jsonc
├── package.json
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── apps/                    # app icons, screenshots
├── src/
│   ├── content.config.ts        # collection schemas — see §4
│   ├── content/
│   │   ├── blog/
│   │   │   └── my-first-post.md
│   │   ├── apps/
│   │   │   ├── launch-window.md
│   │   │   └── rachels-tip-calculator.md
│   │   └── policies/
│   │       ├── launch-window.md
│   │       └── rachels-tip-calculator.md
│   ├── components/
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── PostLayout.astro
│   │   └── PolicyLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── contact.astro
│   │   ├── rss.xml.ts
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── apps/
│   │   │   ├── index.astro
│   │   │   ├── [app].astro
│   │   │   └── [app]/privacy.astro
│   │   └── api/
│   │       └── contact.ts       # prerender = false
│   └── styles/global.css
└── README.md
```

`apps` and `policies` are **separate collections keyed by the same slug**. This
keeps policy frontmatter (effective dates, data categories) from cluttering
marketing copy, while letting the build assert that every app has a policy.

---

## 4. Content schemas

Zod-validated so malformed frontmatter fails the build rather than rendering a
broken page.

**The field lists below are the specification. The surrounding API scaffolding is
not** — imports, loader configuration, and file location were written against the
Astro 5 API and have not been verified against v7. Take the fields, then implement
them using the current content collections documentation. Do not copy the
scaffolding verbatim.

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
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
  loader: glob({ pattern: '**/*.md', base: './src/content/apps' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    platforms: z.array(z.enum(['ios', 'android', 'web'])).nonempty(),
    status: z.enum(['development', 'beta', 'released']),
    appStoreUrl: z.string().url().optional(),
    playStoreUrl: z.string().url().optional(),
    icon: z.string(),
    screenshots: z.array(z.string()).default([]),
    accentColor: z.string().optional(),
    order: z.number().default(0),
  }),
});

const policies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/policies' }),
  schema: z.object({
    appSlug: z.string(),
    effectiveDate: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    dataCollected: z.array(z.string()),      // mirror store privacy labels
    thirdParties: z.array(z.object({
      name: z.string(),
      purpose: z.string(),
      policyUrl: z.string().url(),
    })).default([]),
    childrenPolicy: z.boolean().default(false),
  }),
});

export const collections = { blog, apps, policies };
```

**Build-time invariant:** every entry in `apps` must have a `policies` entry whose
`appSlug` matches. Throw at build time if not. A published app without a reachable
policy URL is a store compliance problem, so it should be impossible to deploy.

**Policies are authored independently, one file per app.** Do not extract shared
partials, a common template, or a boilerplate composition layer, even when two
policies look similar. Each app collects different data, and the resemblance
between policies is coincidental rather than structural. A DRY refactor here means
a change made for one app silently alters a legal document for another.

**Contact address is site-wide.** A single address serves every app and the
contact form. It lives in one site config module and is rendered into each policy
from there — it is not a per-policy frontmatter field. Changing it must be a
one-line change.

---

## 5. URL contract — treat as frozen

Store listings hardcode these. Changing them later means editing App Store Connect
and Play Console entries, and breaking any link already shipped in an app binary.

```
/                                   home
/blog/                              post index
/blog/{slug}/                       post — flat, undated (decided)
/apps/                              app index
/apps/{slug}/                       app landing page
/apps/{slug}/privacy/               privacy policy
/contact/                           contact form
/rss.xml                            feed
```

Set `trailingSlash: 'always'` in `astro.config.mjs` and configure Workers
`not_found_handling` consistently. Pick one form and never serve both.

Do not nest policies under `/privacy/{app}/` or `/legal/`. Do not rename slugs
after an app ships.

---

## 6. Contact form

Single endpoint, `POST /api/contact`, `export const prerender = false`.

**Server-side sequence, in order:**

1. Reject non-POST.
2. Check honeypot field — if filled, return 200 and discard silently.
3. Verify the Turnstile token against Cloudflare's siteverify endpoint. Reject on
   failure. Never trust a client-side-only check.
4. Validate the payload with Zod (name, email, message; cap message length).
5. Send via Resend to the author's address, with `reply-to` set to the submitter.
6. Return JSON. Never echo submitted content back into HTML.

**Secrets** (Workers secrets, never committed, never `PUBLIC_`-prefixed):

- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `CONTACT_TO_EMAIL`

The Turnstile **site** key is public and belongs in client code.

The form UI is the one place a React island is clearly justified — it needs
validation state, a pending state, and a result message. Use `client:load` here
and essentially nowhere else.

Resend requires domain verification via DNS records before it will send from your
domain. Since Cloudflare is already the DNS provider, that's a few records in the
same dashboard, but it must be done before the form works.

---

## 7. Deployment and publishing

Git-connected builds via Workers Builds. Push to `main` → build → live. Non-production
branches produce preview URLs; verify current behaviour in the Workers docs, as this
area is actively changing.

- Build command: `npm run build`
- Output directory: `dist`
- Node version: pin in `.nvmrc` and match it in the build settings

**Publishing a post:** add a markdown file to `src/content/blog/`, commit, push.
No admin UI. Bad frontmatter fails the build with a file path in the error.

**Ordering:** `pubDate` is required on every post and is the sole sort key.
Collection queries return entries in no guaranteed order, so the index and the
feed must each sort explicitly — descending by `pubDate` — rather than relying on
filesystem or loader order. Filenames and URL slugs carry no date and play no part
in sorting. Use `updatedDate` for display only; never sort by it, or editing a
typo in an old post promotes it to the top of the index.

Write dates as full ISO timestamps with an offset (`2026-09-03T09:00:00-04:00`).
A bare `2026-09-03` parses as UTC midnight, which renders as September 2nd in
US Eastern. Two posts on the same bare date also have no deterministic tiebreak.

**Drafts:** `draft: true` in frontmatter, filtered out of every collection query
*and* out of the RSS feed. Do not rely on the file being unlinked — check both.

**Scheduled posts do not work** on a static build. A future-dated post simply does
not exist until something rebuilds. If scheduling is wanted later, a Cloudflare
cron trigger hitting a deploy hook plus a date filter is the pattern. Not in scope now.

---

## 8. Constraints for agents

Things that will look like improvements and are not:

- **Do not add Next.js**, or migrate any part of this to it.
- **Do not add a database**, ORM, KV namespace, or D1 binding. Nothing here has state.
- **Do not install a component library** (MUI, Chakra, shadcn, DaisyUI). Tailwind
  plus the existing design is the whole styling system.
- **Do not make pages React components.** Astro components are the default. React
  is for interactive islands only, and there is currently exactly one.
- **Do not use `client:load` on non-interactive components.** Prefer no directive;
  then `client:visible`; `client:load` only for above-the-fold interactivity.
- **Do not change URLs in §5.**
- **Do not put secrets in `astro.config.mjs`, client code, or any `PUBLIC_` variable.**
- **Do not add tracking scripts, chat widgets, or third-party embeds** without asking.
- **Do not deduplicate the privacy policies.** They are separate legal documents
  that happen to share phrasing. See §4.
- **Do not weaken the schemas** to make a build pass. If content fails validation,
  fix the content or raise the schema question — do not make fields optional to
  silence an error.

When a requirement is ambiguous, ask rather than guessing. When a task requires
something on this list, stop and explain why.

---

## 9. Acceptance checklist

- [ ] `npm run build` succeeds from clean install
- [ ] Build fails when an app has no matching policy
- [ ] Build fails on malformed frontmatter
- [ ] Every route in §5 resolves, with consistent trailing slashes
- [ ] Blog index sorted by `pubDate` descending, drafts excluded
- [ ] `/rss.xml` validates and excludes drafts
- [ ] Sitemap generated and referenced from `robots.txt`
- [ ] Contact form: rejects missing/invalid Turnstile token server-side
- [ ] Contact form: honeypot submission returns 200 and sends nothing
- [ ] Contact form: delivers real mail end to end
- [ ] Lighthouse ≥ 95 on home, a post, and an app page
- [ ] Zero JS shipped on pages with no island (verify in network tab)
- [ ] Each app page links to its own policy; each policy links back
- [ ] Meta tags and Open Graph present on all page types
- [ ] Renders correctly at 375px width

---

## 10. Decisions

**Settled — implement as stated, do not revisit:**

- Each app gets its own independently written policy file. No shared partials. (§4)
- One contact address for all apps and the contact form, held in site config. (§4)
- Blog post URLs are flat and undated: `/blog/{slug}/`. Ordering comes from
  `pubDate`, which is unaffected by URL shape. (§5, §7)

**Still open — requires the author, not an agent:**

1. **Data categories per app.** Apple compares policy text against the privacy
   nutrition labels in the store listing, and a mismatch is a rejection risk. Each
   app's `dataCollected` array and `thirdParties` list must be written by hand
   against what that app actually does.

   The two apps are likely to sit at opposite ends of this. If Rachel's Tip
   Calculator does its arithmetic on-device with no network calls, its policy is a
   short "no data collected" document and its nutrition label is Data Not
   Collected — still required, still needs to be accurate. Launch Window sends
   push notifications and talks to a backend, so device tokens and any backend
   provider need explicit disclosure.

   Agents must not infer, generate, or fill in these categories. Leave the fields
   empty and flag them if they arrive unpopulated.
