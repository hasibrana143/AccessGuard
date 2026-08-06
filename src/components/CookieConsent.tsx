'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  // Design-system compliant: semantic tokens only (see docs/design/ux/DARK_MODE.md §design-rules),
  // 44px touch targets (RESPONSIVE_RULES §5), persistent focus ring.
  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[9999] flex flex-wrap items-start justify-between gap-3 border-t border-border bg-card p-4 text-card-foreground shadow-lg sm:items-center sm:p-6"
    >
      <p className="m-0 max-w-[640px] text-sm leading-relaxed text-foreground">
        We use essential cookies for authentication and session management.
        Analytics cookies are used only with your consent.{' '}
        <a
          href="/api/legal/privacy"
          target="_blank"
          className="text-primary underline underline-offset-4"
        >
          Privacy Policy
        </a>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={accept}
          className="h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Accept All
        </button>
        <button
          onClick={decline}
          className="h-11 rounded-md border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Essential Only
        </button>
      </div>
    </div>
  );
}