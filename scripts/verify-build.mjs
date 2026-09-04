#!/usr/bin/env node
// Post-build verification (plan Task 25 / spec "Verification").
// Runs after `npm run build`, asserting things about the built output that a
// browser-less script can check. Collects every failure before exiting so a
// single run reports everything wrong at once.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

// The Cloudflare adapter's build produces `dist/server/` (the Worker) and
// `dist/client/` (the static assets actually served) — the latter is what
// this script must inspect, not `dist/` itself.
const DIST = join(process.cwd(), 'dist', 'client');

const failures = [];
const fail = (message) => failures.push(message);

function walkHtmlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// --- Step 1: every brief §5 route (plus About/Now/Consulting/Changelog) exists ---
const routes = [
  '/',
  '/blog/',
  '/blog/my-first-post/',
  '/apps/',
  '/apps/launch-window/',
  '/apps/launch-window/privacy/',
  '/apps/rachels-tip-calculator/',
  '/apps/rachels-tip-calculator/privacy/',
  '/contact/',
  '/about/',
  '/now/',
  '/consulting/',
  '/changelog/',
];

for (const route of routes) {
  const trimmed = route.replace(/^\/|\/$/g, '');
  const filePath = trimmed === '' ? join(DIST, 'index.html') : join(DIST, trimmed, 'index.html');
  if (!existsSync(filePath)) {
    fail(`Missing route: "${route}" — expected ${filePath}`);
  }
}

// --- Step 2: non-page-route files exist ---
const requiredFiles = ['rss.xml', '404.html', 'sitemap-index.xml', 'robots.txt'];
for (const file of requiredFiles) {
  const filePath = join(DIST, file);
  if (!existsSync(filePath)) {
    fail(`Missing required file: dist/client/${file}`);
  }
}

// --- Step 3: robots.txt contains the absolute sitemap URL ---
const robotsPath = join(DIST, 'robots.txt');
if (existsSync(robotsPath)) {
  const expectedSitemapUrl = 'https://eleven30.xyz/sitemap-index.xml';
  const robotsContent = readFileSync(robotsPath, 'utf-8');
  if (!robotsContent.includes(expectedSitemapUrl)) {
    fail(`dist/client/robots.txt does not contain "${expectedSitemapUrl}"`);
  }
}

const htmlFiles = existsSync(DIST) ? walkHtmlFiles(DIST) : [];

// --- Step 4: zero-JS-except-contact check ---
// This Astro build never emits `<script type="module">` for client hydration
// — instead a hydrated island shows up as an `<astro-island>` custom element
// paired with one or more classic `<script>` tags (no `type` attribute, e.g.
// the Astro runtime bootstrap and the island's own bundle) that call
// `import()` at runtime. The only legitimate `<script>` tag on non-hydrated
// pages is `<script type="application/ld+json">` (JSON-LD structured data),
// so anything else — a script with no `type`, or a `type` other than
// `application/ld+json` — is a hydration (or otherwise unexpected JS) signal.
const contactIndexPath = join(DIST, 'contact', 'index.html');
const indexFiles = htmlFiles.filter((filePath) => basename(filePath) === 'index.html');
const scriptTagPattern = /<script\b[^>]*>/gi;

function findHydrationSignatures(content) {
  const signatures = [];
  if (content.includes('<astro-island')) {
    signatures.push('<astro-island> element');
  }
  for (const scriptTag of content.match(scriptTagPattern) ?? []) {
    const typeMatch = scriptTag.match(/\btype\s*=\s*"([^"]*)"|\btype\s*=\s*'([^']*)'/i);
    const type = typeMatch ? typeMatch[1] ?? typeMatch[2] : null;
    if (type !== 'application/ld+json') {
      signatures.push(type ? `<script type="${type}">` : '<script> (no type attribute)');
    }
  }
  return signatures;
}

for (const filePath of indexFiles) {
  if (filePath === contactIndexPath) continue;
  const content = readFileSync(filePath, 'utf-8');
  const signatures = findHydrationSignatures(content);
  if (signatures.length > 0) {
    fail(`Unexpected client-hydration JS in ${filePath} (only /contact/ may ship JS): ${signatures.join(', ')}`);
  }
}

// --- Step 5: double-escaping check ---
// A literal `&#39;` (e.g. `Rachel&#39;s Tip Calculator`) is Astro escaping a
// real apostrophe once, which is correct and renders fine in a browser — it
// is not the defect. The actual bug this guards against is a *pre-escaped*
// entity in source (e.g. a literal `&#39;` typed in frontmatter) getting
// escaped a second time by Astro, which produces `&amp;#39;` in the built
// HTML and shows up as the literal text "&#39;" on screen. So the check is
// for the double-escape signature `&amp;#`, not for bare `&#39;`.
for (const filePath of htmlFiles) {
  const content = readFileSync(filePath, 'utf-8');
  if (content.includes('&amp;#')) {
    fail(`Double-escaped HTML entity ("&amp;#") found in ${filePath}`);
  }
}

// --- Step 6: report and exit ---
if (failures.length > 0) {
  console.error(`verify-build: ${failures.length} check(s) failed:\n`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
} else {
  console.log(`verify-build: all checks passed (${routes.length} routes, ${htmlFiles.length} HTML files scanned).`);
  process.exit(0);
}
