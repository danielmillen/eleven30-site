import { env } from 'cloudflare:workers';

/**
 * Reads a required secret/binding from the Worker environment.
 *
 * Returns `undefined` (after a server-side `console.error` naming the
 * missing key) instead of throwing, so callers can turn a missing secret
 * into a clean `500` response rather than letting a `TypeError` bubble up
 * as an unhandled error with no log line.
 */
export function requireEnv(name: string): string | undefined {
  const value = env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    return undefined;
  }
  return value;
}
