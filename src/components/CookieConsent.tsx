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

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ margin: 0, fontSize: 14, maxWidth: 640, lineHeight: 1.5 }}>
        We use essential cookies for authentication and session management.
        Analytics cookies are used only with your consent.{' '}
        <a
          href="/api/legal/privacy"
          target="_blank"
          style={{ color: '#60a5fa', textDecoration: 'underline' }}
        >
          Privacy Policy
        </a>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={accept}
          style={{
            padding: '8px 20px',
            backgroundColor: '#15803d',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Accept All
        </button>
        <button
          onClick={decline}
          style={{
            padding: '8px 20px',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Essential Only
        </button>
      </div>
    </div>
  );
}
