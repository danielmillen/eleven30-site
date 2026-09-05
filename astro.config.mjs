// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
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
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/api/') })],
  vite: {
    plugins: [tailwindcss()],
    server: { watch: { ignored: ['**/.worktrees/**'] } },
  },
  fonts: [
    { provider: fontProviders.google(), name: 'Instrument Sans',  cssVariable: '--font-instrument-sans',  weights: ['400 700'], styles: ['normal', 'italic'], subsets: ['latin'] },
    { provider: fontProviders.google(), name: 'Instrument Serif', cssVariable: '--font-instrument-serif', weights: [400],       styles: ['normal', 'italic'], subsets: ['latin'] },
    { provider: fontProviders.google(), name: 'IBM Plex Mono',    cssVariable: '--font-ibm-plex-mono',    weights: [400, 500],  styles: ['normal'],           subsets: ['latin'] },
  ],
});
