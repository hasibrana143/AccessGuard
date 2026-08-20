'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConsent() {
      try {
        const res = await fetch('/api/consent');
        const data = await res.json();
        if (data.consent === 'pending') {
          setVisible(true);
        }
      } catch {
        // Fallback to localStorage for anonymous users
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
          setVisible(true);
        }
      } finally {
        setLoading(false);
      }
    }
    checkConsent();
  }, []);

  async function submitConsent(consent: 'accepted' | 'declined') {
    setLoading(true);
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent }),
      });
      if (res.ok) {
        setVisible(false);
      } else {
        // Fallback to localStorage on API failure
        localStorage.setItem('cookie-consent', consent);
        setVisible(false);
      }
    } catch {
      // Fallback to localStorage on network error
      localStorage.setItem('cookie-consent', consent);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  if (!visible || loading) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[9999] flex flex-wrap items-start justify-between gap-3 border-t border-border bg-card p-4 text-card-foreground shadow-lg sm:items-center sm:p-6"
    >
      <p className="m-0 max-w-[640px] text-sm leading-relaxed text-foreground">
        {t.rich('description', {
          link: (chunks) => <a href="/api/legal/privacy" target="_blank" className="underline">{chunks}</a>,
        })}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => submitConsent('accepted')}
          disabled={loading}
          className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          {t('accept')}
        </button>
        <button
          onClick={() => submitConsent('declined')}
          disabled={loading}
          className="h-11 rounded-md border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
        >
          {t('decline')}
        </button>
      </div>
    </div>
  );
}