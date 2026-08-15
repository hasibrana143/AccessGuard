'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, Mail, Users } from 'lucide-react';

interface InviteDetails {
  email: string;
  role: string;
  organizationName: string;
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('invite');
  const token = searchParams.get('invite-token');

  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('missingToken'));
      setLoading(false);
      return;
    }
    fetch(`/api/team/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDetails(json.data);
        } else {
          setError(json.error || t('invalidExpired'));
        }
      })
      .catch(() => setError(t('loadFailed')))
      .finally(() => setLoading(false));
  }, [token, t]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const json = await res.json();
      if (json.success) {
        setAccepted(true);
        setTimeout(() => router.push('/auth/login'), 1200);
      } else if (json.needAuth) {
        setNeedAuth(true);
      } else {
        setError(json.error || t('acceptFailed'));
      }
    } catch {
      setError(t('acceptFailed'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Shield className="h-8 w-8 text-coral" />
          <h1 className="text-xl font-bold">AccessGuard</h1>
        </div>

        {loading && <p className="text-center text-sm text-muted-foreground">{t('loading')}</p>}

        {error && (
          <div className="p-6 rounded-xl border border-border bg-card text-center space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm font-medium text-coral hover:underline"
            >
              {t('goHome')}
            </button>
          </div>
        )}

        {!loading && !error && details && (
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            {accepted ? (
              <div className="text-center space-y-2">
                <div className="text-3xl">✓</div>
                <p className="font-semibold">{t('accepted')}</p>
                <p className="text-sm text-muted-foreground">{t('redirecting')}</p>
              </div>
            ) : needAuth ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t.rich('accountExists', {
                    email: details.email,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <button
                  onClick={() => router.push(`/auth/login?email=${encodeURIComponent(details.email)}`)}
                  className="w-full py-2.5 rounded-lg bg-coral text-coral-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {t('signInToAccept')}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <Users className="h-6 w-6 text-coral mx-auto" />
                  <h2 className="font-semibold">{t('invitedTitle', { org: details.organizationName })}</h2>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {details.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{t('roleLabel', { role: details.role })}</p>
                </div>

                <form onSubmit={handleAccept} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1.5">{t('yourName')}</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-coral"
                      placeholder={t('namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1.5">{t('createPassword')}</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:border-coral"
                      placeholder={t('passwordPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('passwordHint')}
                    </p>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={accepting}
                    className="w-full py-2.5 rounded-lg bg-coral text-coral-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {accepting ? t('accepting') : t('acceptInvite')}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
