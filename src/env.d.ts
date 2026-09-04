// `@astrojs/cloudflare` v13+ exposes the Worker's bindings/secrets via the
// `cloudflare:workers` built-in module rather than `Astro.locals.runtime`.
// Neither `@astrojs/cloudflare` nor this project depends on
// `@cloudflare/workers-types`, so this ambient module declaration is the
// minimal typing needed for `import { env } from 'cloudflare:workers'`.
declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>;
}

// Public (client-visible) build-time env vars. Astro inlines `import.meta.env.PUBLIC_*`
// values at build time; this typing lets contact.astro read it under strict mode.
interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}
