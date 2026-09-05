# Design import — decisions and route mapping

This site was designed as a single Claude Design canvas (`eleven30-site.dc.html`
in this folder) before `docs/site-build-brief.md` was finalized. The canvas uses
a client-side page-switcher (`sc-if`/`x-import`/`{{ }}` bindings, a custom
preview DSL) purely to preview every page in one file — **none of that syntax is
real code**. Treat the canvas as content + layout reference only; build real
Astro pages/routes per `docs/site-build-brief.md`.

The author (Dan) resolved the following conflicts between the canvas and the
brief before implementation started. These are settled — do not re-ask:

## 1. Privacy policy: per-app (brief wins)

The canvas shows one combined `/privacy/` page ("applies to eleven30.xyz and
every Eleven30 app"). The brief requires **separate, independently-written**
policies per app at `/apps/{slug}/privacy/` (site-build-brief.md §4, §5, §10),
with a build-time check that every app has a matching policy.

Build it the brief's way: two separate policy content entries (`launch-window`,
`rachels-tip-calculator`), not one shared page. Do **not** create a generic
`/privacy/` route.

Split the canvas's single privacy narrative across the two policies by what
actually applies to each app:
- **Rachel's Tip Calculator**: no location, no account, on-device arithmetic
  only. Short "no data collected" style policy.
- **Launch Window**: can use device location (on-device only, to sort launch
  sites / estimate visibility — not stored server-side), no account.

Per site-build-brief.md §10 (still open, decision #1): the exact `dataCollected`
and `thirdParties` frontmatter arrays are for the author to fill in by hand —
**do not invent or infer them**. Leave those fields empty/minimal and flag it in
your final report if they ship unpopulated. The prose body of each policy page
can adapt the canvas's plain-language style (it's explicitly labeled in the
canvas as "a design placeholder... have a lawyer check it before submitting to
the app stores" — keep that disclaimer, or an equivalent, on both policies).

## 2. App name: "Launch Window" (provisionally)

The canvas calls the rocket-launch app "Launch Countdown" and shows a
"Name not final" badge on its page. The brief has already settled on the name
"Launch Window" (slug `launch-window`). **The name is still genuinely
unsettled** — use "Launch Window" / `launch-window` everywhere for now (content
collection entry, route, nav, copy), but it's fine to keep a "name not final"
signal (e.g. the same badge treatment) on that app's own page if it reads
naturally, since the author may still rename it.

## 3. Extra pages beyond the brief's 4 capabilities: build them all

The brief scopes the build to blog, app landing pages, per-app privacy, and a
contact form (§1), with a "frozen" URL list (§5) that doesn't mention them. The
canvas also designs About, Now, Consulting, Support, and Changelog (release
notes) pages. Decision: **build all of them**, as additional static Astro pages
outside the collections model (no content collection needed for these — plain
`.astro` pages with the copy from the canvas is fine, since they're not
per-item content like blog posts or apps). None of them need a database, CMS,
accounts, or any other brief non-goal.

Suggested routes for the new pages (not in the brief's frozen list, so these
are free to pick sensibly — trailing slash always, matching site convention):
- `/about/`
- `/now/`
- `/consulting/`
- `/changelog/`
- Support: the canvas's "Support" page is really the brief's contact form
  (§6) plus an FAQ list and a support-contacts card. Merge it into the brief's
  required `/contact/` route — same URL, richer content (FAQ + contact info
  alongside the actual working form). Don't create a separate `/support/` URL.

Nav (from the canvas): Apps, Blog, About, Consulting, Support(→ `/contact/`).
Footer columns: **Apps** (Launch Window, Rachel's Tip Calculator, Release
notes), **Eleven30** (About, Now, Blog, Consulting), **Help** (Support→
`/contact/`, Privacy — link each app's own privacy page or the more relevant
one contextually since there's no single privacy page anymore; simplest is to
drop the single "Privacy policy" footer link and instead surface privacy links
from each app's own card/footer section, or link to `/apps/` as the jumping-off
point — use judgement, it's a minor nav design call).

## 4. Blog seed content: one placeholder post only

The canvas's 5 sample posts (dates, titles, dek, body paragraphs) are
illustrative marketing copy, not real writing — do not publish them as real
blog content. Build the blog index/post templates and content collection, and
seed with exactly **one** example post matching the brief's file tree
(`src/content/blog/my-first-post.md`), clearly a placeholder (e.g. reuse the
canvas's first sample post as that placeholder, or write a minimal "hello
world" post) for the author to replace.

## Content mapping reference (canvas → real content)

The canvas's inline `<script type="text/x-dc">` block (bottom of
`eleven30-site.dc.html`) has the actual copy as JS data objects — this is the
real source text to adapt, not the surrounding template markup. Key objects:
`APPS` (both apps' name/tagline/pitch/platform/price), `POSTS` (sample blog
posts — use only the first as the seed post per decision #4), `BODY`/`BODY2`
(sample post body paragraphs), and the big `renderVals()` return object further
down with `launchSteps`, `launchFacts`, `tipFeatures`, `nowItems`/`nowLong`,
`elsewhere`, `principles`, `services`, `faqs`, `contacts`, `releases`,
`privacySections`, `footerCols`, `appLinks` — all real prose for the
corresponding page.

Placeholder identity content in the canvas that the author still needs to fill
in — leave these as obvious TODOs, don't invent values: `[Your name]` (post
byline, About page H1), `github.com/[handle]` (About "elsewhere" list), the
portrait/desk/screenshot photo placeholders (already rendered as dashed
placeholder boxes per `component-spec.md` — keep that treatment).

The site-wide accent is **teal** (`data-accent="teal"` in the canvas — the
"deep teal-blue... consulting, B2B" hue from the design system, token file
`tokens/colors.css`), not the design system's default evergreen. Apply
`data-accent="teal"` at the document root.

Contact form (`/contact/`, site-build-brief.md §6): the canvas's form only has
"Your email", "Which app?" (select), and a single-line "What's going on?"
input. The brief requires **name, email, message** fields plus a hidden
honeypot field and a Cloudflare Turnstile widget, validated server-side in that
order. Extend the canvas's form layout with a name field and swap the
single-line "what's going on" input for a proper multi-line message field (see
`component-spec.md`'s Input/Textarea note), add the honeypot (visually hidden)
and the Turnstile widget before the submit button. Keep the "Which app?" select
as an optional field (useful triage context, not in the brief's required set —
fine to keep it, just don't make it required if that'd block a general
inquiry).
