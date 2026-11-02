'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { fmt, type Dictionary } from '@/shared/i18n';

type Props = { t: Dictionary; initialError?: string };

type ErrorKey = keyof Dictionary['auth']['errors'];

function isErrorKey(t: Dictionary, key: string | undefined): key is ErrorKey {
  return key !== undefined && key in t.auth.errors;
}

const inputClass =
  'h-12 w-full rounded-tile border border-line bg-ink px-3.5 text-base text-cream placeholder:text-dim';
const primaryButton =
  'min-h-12 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim';

/** Вхід: Google або email із одноразовим кодом. Реєстрація й вхід це один потік. */
export function SignInForm({ t, initialError }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(isErrorKey(t, initialError) ? initialError : null);

  async function post(url: string, payload: unknown): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) return { ok: true };
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error };
    } catch {
      return { ok: false, error: 'generic' };
    }
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await post('/api/auth/email/request', { email });
    setBusy(false);
    if (result.ok) {
      setStep('code');
      setCode('');
    } else {
      setError(isErrorKey(t, result.error) ? result.error : 'generic');
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await post('/api/auth/email/verify', { email, code });
    if (result.ok) {
      router.replace('/');
      router.refresh();
      return;
    }
    setBusy(false);
    setError(isErrorKey(t, result.error) ? result.error : 'generic');
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-tile border border-danger bg-surface px-4 py-3 text-sm text-danger">
          {t.auth.errors[error]}
        </p>
      )}

      {step === 'email' ? (
        <>
          <a
            href="/api/auth/google"
            className="flex min-h-12 items-center justify-center rounded-tile border border-dim px-5 font-semibold hover:bg-surface"
          >
            {t.auth.google}
          </a>

          <div className="flex items-center gap-3 text-sm text-muted">
            <div className="h-px flex-1 bg-line" />
            <span>{t.auth.or}</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={sendCode} className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm font-semibold">
              {t.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? t.auth.sending : t.auth.sendCode}
            </button>
            <p className="text-sm text-muted">{t.auth.codeHint}</p>
          </form>
        </>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-bold">{t.auth.codeTitle}</h2>
          <p className="text-sm text-muted">{fmt(t.auth.codeSent, { email })}</p>
          <label htmlFor="code" className="text-sm font-semibold">
            {t.auth.codeLabel}
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} text-center font-heading text-2xl tracking-[0.4em]`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={primaryButton}>
            {busy ? t.auth.verifying : t.auth.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
            className="self-start text-sm text-amber underline underline-offset-4"
          >
            {t.auth.changeEmail}
          </button>
        </form>
      )}
    </div>
  );
}
