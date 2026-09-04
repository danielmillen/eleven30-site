import { useEffect, useRef, useState } from 'react';
import { SITE } from '../config/site';

// Cloudflare's Turnstile script attaches this global once it loads. Declared
// here rather than in a shared ambient .d.ts because this is the only file
// on the site that touches it.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface Props {
  siteKey: string; // resolved PUBLIC_TURNSTILE_SITE_KEY (or test-key fallback), computed by contact.astro
  appOptions: { value: string; label: string }[]; // must stay in sync with api/contact.ts's app enum: launch-window | rachels-tip-calculator | other
}

type Status = 'idle' | 'pending' | 'success' | 'failure';

export default function ContactForm({ siteKey, appOptions }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [app, setApp] = useState(() => appOptions[0]?.value ?? '');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real visitors never fill this
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [turnstileError, setTurnstileError] = useState(false);

  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  // Explicit rendering: the Turnstile script may still be loading when this
  // effect runs, so poll for `window.turnstile` rather than assuming it's
  // already there. Give up after ~10s (ad-blocker, CSP, network failure) so
  // the button doesn't sit silently, permanently disabled with no
  // explanation.
  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const POLL_TIMEOUT_MS = 10_000;

    function tryRender() {
      if (cancelled) return;
      if (window.turnstile && turnstileContainerRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          callback: (t) => setToken(t),
        });
      } else if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setTurnstileError(true);
      } else {
        pollId = setTimeout(tryRender, 100);
      }
    }
    tryRender();

    return () => {
      cancelled = true;
      if (pollId) clearTimeout(pollId);
    };
  }, [siteKey]);

  // Turnstile tokens are single-use with a 300s lifetime. Any response that
  // isn't a clean success means the token is spent (or never valid), so it
  // must be discarded and the widget reset before the button can be pressed
  // again — otherwise a retry submits a stale token and gets
  // timeout-or-duplicate from Cloudflare.
  function resetTurnstile() {
    if (window.turnstile && widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setToken(null);
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || status === 'pending') return;

    setStatus('pending');

    try {
      // `trailingSlash: 'always'` (astro.config.mjs) means the endpoint only
      // resolves at the slashed URL — a bare `/api/contact` 404s, both in
      // `astro dev` and under real `workerd` via `astro preview`.
      const response = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          app: app || undefined,
          website,
          'cf-turnstile-response': token,
        }),
      });

      if (response.ok) {
        setName('');
        setEmail('');
        setApp(appOptions[0]?.value ?? '');
        setMessage('');
        setWebsite('');
        resetTurnstile();
        setStatus('success');
      } else {
        resetTurnstile();
        setStatus('failure');
      }
    } catch {
      resetTurnstile();
      setStatus('failure');
    }
  }

  const disabled = status === 'pending';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="contact-name" className="text-label font-medium text-fg">
          Your name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          maxLength={80}
          className="e30-field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-email" className="text-label font-medium text-fg">
          Your email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          className="e30-field w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-app" className="text-label font-medium text-fg">
          Which app?
        </label>
        <select
          id="contact-app"
          name="app"
          className="e30-field w-full"
          value={app}
          onChange={(e) => setApp(e.target.value)}
          disabled={disabled}
        >
          {appOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-message" className="text-label font-medium text-fg">
          What's going on?
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          maxLength={5000}
          placeholder="The countdown stopped updating after…"
          className="e30-field w-full min-h-[140px] py-3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/*
        Honeypot. Off-screen positioning rather than display:none or
        visibility:hidden — some bots skip fields hidden that way precisely
        because screen readers do too, but an off-screen-positioned,
        rendered input still gets auto-filled by simple bots. Real visitors
        never see or reach it (tabIndex -1, aria-hidden).
      */}
      <div style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div ref={turnstileContainerRef} />

      {turnstileError && (
        <p role="alert" className="text-caption text-fg-critical">
          Couldn't load the verification widget — try reloading the page, or email {SITE.contactEmail} directly.
        </p>
      )}

      <button
        type="submit"
        className="e30-btn e30-btn--lg e30-btn--primary w-full"
        disabled={!token || disabled}
      >
        {status === 'pending' ? 'Sending…' : 'Send to support'}
      </button>

      {status === 'success' && (
        <p role="status" className="text-caption text-fg">
          Thanks — I'll get back to you {SITE.replyWindow.toLowerCase()}.
        </p>
      )}
      {status === 'failure' && (
        <p role="alert" className="text-caption text-fg-critical">
          Something went wrong. Please try again, or email {SITE.contactEmail} directly.
        </p>
      )}
    </form>
  );
}
