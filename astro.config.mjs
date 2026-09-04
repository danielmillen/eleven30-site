// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
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
