# eleven30-site

Eleven30's personal site: a blog, landing pages for indie apps, a per-app
privacy policy for each of those apps, and a contact form. Built with
[Astro](https://astro.build) 7, React (for interactive bits), and
[Tailwind CSS](https://tailwindcss.com) 4, and deployed to
[Cloudflare Workers](https://developers.cloudflare.com/workers/) using static
assets plus a small API route for the contact form.

## Prerequisites

- Node.js `22.12.0` or later (see `.nvmrc`; `nvm use` will pick this up).

## Commands

All commands are run from the repo root.

| Command           | Action                                                                 |
| :---------------- | :---------------------------------------------------------------------|
| `npm install`     | Install dependencies                                                   |
| `npm run dev`     | Start the local dev server at `localhost:4321`                        |
| `npm run build`   | Type-check (`astro check`) and build the production site to `./dist/` |
| `npm run preview` | Preview the production build locally                                  |
| `npm run verify`  | Run post-build checks against `./dist/` (routes, sitemap, etc.)       |

When starting the dev server yourself, run it in the background
(`astro dev --background`, managed with `astro dev stop`/`status`/`logs`) —
see `AGENTS.md` for details.

## Content

Blog posts, apps, and privacy policies are all Markdown content collections
under `src/content/` (schemas defined in `src/content.config.ts`):

- `src/content/blog/` — blog posts
- `src/content/apps/` — app landing page data (one file per app)
- `src/content/policies/` — one privacy policy per app, keyed by `appSlug`

Adding a blog post, or adding a new app together with its privacy policy, is
a content-only change — drop in a new Markdown file with the right
frontmatter and the corresponding pages, sitemap entries, and the contact
form's app dropdown all pick it up automatically. No route or component code
needs to change for these cases.

## Environment variables & secrets

The contact form (`src/pages/api/contact.ts`) needs the following at
runtime, set as Cloudflare Workers secrets (not committed):

```sh
wrangler secret put RESEND_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put CONTACT_TO_EMAIL
```

- `RESEND_API_KEY` — used to send the contact email via [Resend](https://resend.com).
  The sending domain (`eleven30.xyz`) must be verified in Resend via DNS
  before sending will work.
- `TURNSTILE_SECRET_KEY` — server-side secret for verifying the
  [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) challenge.
- `CONTACT_TO_EMAIL` — the address contact form submissions are forwarded to.

`PUBLIC_TURNSTILE_SITE_KEY` is different: it's a **build-time** variable
(inlined into the client bundle), not a runtime secret, so it must be set as
an environment variable in the Cloudflare Workers Build configuration rather
than with `wrangler secret put`. Without it, the contact page falls back to
Turnstile's "always passes" test key, which is fine for local dev but not
for production.

For local development, create a `.dev.vars` file (gitignored) at the repo
root with the same runtime variables, e.g.:

```
RESEND_API_KEY=...
TURNSTILE_SECRET_KEY=...
CONTACT_TO_EMAIL=...
```

## Deployment

The site deploys via a git-connected Cloudflare Workers Build: pushes build
with `npm run build` and serve `dist` as the output directory (static
assets, per `wrangler.jsonc`, plus the `contact` API route as a Worker).
Whether DNS/domain verification for `eleven30.xyz` and Resend is fully
complete in production is not tracked in this repo — check the Cloudflare
and Resend dashboards directly.
