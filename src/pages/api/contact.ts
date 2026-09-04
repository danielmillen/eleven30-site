import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { requireEnv } from '../../lib/env';
import { getApps } from '../../lib/collections';

export const prerender = false;

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Eleven30 site <noreply@eleven30.xyz>';

// Allowed app slugs are derived from the content collection at request time
// (rather than a hardcoded literal) so adding an app is a content-only
// change end-to-end — see src/pages/contact.astro's dropdown, which is built
// the same way.
async function getContactSchema() {
  const apps = await getApps();
  const appSlugs = [...apps.map((app) => app.id), 'other'];
  return z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email().max(254),
    message: z.string().trim().min(1).max(5000),
    app: z.enum(appSlugs).optional(),
  });
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ok = () => json(200, { ok: true });
const invalid = () => json(400, { ok: false, error: 'invalid' });
const challengeFailed = () => json(403, { ok: false, error: 'challenge_failed' });
const sendFailed = () => json(500, { ok: false, error: 'send_failed' });
const serverError = () => json(500, { ok: false, error: 'server_error' });

// Astro dispatches here only when no more-specific method handler (e.g. POST)
// exists for the request, so any non-POST method lands here.
export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });

export const POST: APIRoute = async ({ request }) => {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return invalid();
  }
  if (typeof parsedBody !== 'object' || parsedBody === null) {
    return invalid();
  }
  const body = parsedBody as Record<string, unknown>;

  // Honeypot: bots fill this hidden field. Silent discard, no further work.
  if (typeof body.website === 'string' && body.website.length > 0) {
    return ok();
  }

  const token = body['cf-turnstile-response'];
  if (typeof token !== 'string' || token.length === 0) {
    return challengeFailed();
  }

  const turnstileSecret = requireEnv('TURNSTILE_SECRET_KEY');
  if (!turnstileSecret) return serverError();

  const verifyParams = new URLSearchParams({
    secret: turnstileSecret,
    response: token,
    remoteip: request.headers.get('CF-Connecting-IP') ?? '',
  });
  const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams,
  });
  const verifyResult = (await verifyResponse.json()) as { success?: boolean };
  if (!verifyResult.success) {
    return challengeFailed();
  }

  const contactSchema = await getContactSchema();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return invalid();
  }
  const { name, email, message, app } = parsed.data;

  const resendApiKey = requireEnv('RESEND_API_KEY');
  const contactToEmail = requireEnv('CONTACT_TO_EMAIL');
  if (!resendApiKey || !contactToEmail) return serverError();

  const subject = app ? `New contact form message (${app})` : 'New contact form message';
  const text = [`Name: ${name}`, `Email: ${email}`, `App: ${app ?? 'n/a'}`, '', message].join('\n');

  const resendResponse = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [contactToEmail],
      subject,
      text,
      reply_to: email,
    }),
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    console.error(`Resend request failed (${resendResponse.status}): ${errorBody}`);
    return sendFailed();
  }

  return ok();
};
