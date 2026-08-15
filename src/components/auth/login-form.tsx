'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Eye, EyeOff, Loader2, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

interface LoginFormProps {
  onBack: () => void;
  onSwitchToRegister: () => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.35 11.1H12v3.6h5.3c-.5 2.3-2.4 3.9-5.3 3.9-3.2 0-5.8-2.6-5.8-5.9S8.8 6.8 12 6.8c1.6 0 3 .6 4.1 1.6l2.7-2.7C17.2 4.2 14.7 3.2 12 3.2c-5 0-9 4-9 9s4 9 9 9c5.2 0 8.7-3.7 8.7-8.9 0-.6-.1-1.1-.35-1.2z" fill="#4285F4" />
      <path d="M3.6 12c0 4.4 3.6 8 8 8z" fill="#34A853" opacity="0" />
    </svg>
  );
}

export function LoginForm({ onBack, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  const [providers, setProviders] = useState<Record<string, { name: string }>>({});

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((res) => res.json())
      .then((data) => setProviders(data || {}))
      .catch(() => {});
  }, []);

  const handleOAuth = async (provider: string) => {
    setOauthProvider(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/dashboard', redirect: false });
      if (result?.url) {
        window.location.href = result.url;
      } else if (!result?.ok) {
        toast({ title: t('providerSignInFailed', { provider }), description: result?.error || t('couldNotReachProvider'), variant: 'destructive' });
        setOauthProvider(null);
      }
    } catch {
      toast({ title: t('serverError'), variant: 'destructive' });
      setOauthProvider(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        mfaCode: mfaRequired ? mfaCode : undefined,
        redirect: false,
      });
      if (result?.ok) {
        toast({ title: t('loginTitle'), description: t('signInSuccess') });
        router.push('/dashboard');
      } else {
        if (result?.error === 'MFA_REQUIRED') {
          setMfaRequired(true);
          toast({ title: t('mfaTitle'), description: t('mfaRequiredToast') });
        } else {
          toast({ title: t('loginFailed'), description: result?.error || t('invalidCredentials'), variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: t('serverError'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-coral/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          {t('backToHome')}
        </Button>
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-coral/10">
                <Shield className="h-8 w-8 text-coral" />
              </div>
            </div>
            <h1 className="font-semibold leading-none tracking-tight text-2xl">{t('loginTitle')}</h1>
            <CardDescription>{t('loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{tc('email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{tc('password')}</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('enterPassword')} required autoComplete="current-password" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {mfaRequired && (
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">{t('authenticatorCode')}</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    required
                    autoComplete="one-time-code"
                    className="text-center text-lg tracking-[0.3em] font-mono"
                  />
                </div>
              )}
              <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('signingIn')}</> : mfaRequired ? t('verifyAndSignIn') : t('signIn')}
              </Button>
            </form>
          </CardContent>
          {providers.github || providers.google ? (
            <div className="px-6 pb-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {providers.github && (
                  <Button variant="outline" className="w-full h-11" disabled={!!oauthProvider} onClick={() => handleOAuth('github')}>
                    {oauthProvider === 'github' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Github className="h-4 w-4 mr-2" />}
                    GitHub
                  </Button>
                )}
                {providers.google && (
                  <Button variant="outline" className="w-full h-11" disabled={!!oauthProvider} onClick={() => handleOAuth('google')}>
                    {oauthProvider === 'google' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GoogleIcon className="h-4 w-4 mr-2" />}
                    Google
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <CardFooter className="flex flex-col gap-4">
            <Button variant="link" className="text-sm text-muted-foreground" onClick={() => router.push('/auth/forgot-password')}>
              {t('forgotPassword')}
            </Button>
            <div className="text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Button variant="link" className="p-0 h-auto text-coral" onClick={onSwitchToRegister}>{t('signUp')}</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
