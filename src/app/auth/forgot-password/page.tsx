'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        if (data.demoToken) {
          setDemoToken(data.demoToken);
        }
        toast({ title: t('emailSent'), description: t('resetSentDesc') });
      } else {
        toast({ title: tc('error'), description: data.error || t('failedSendReset'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('serverError'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-coral/5 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-4 right-0 z-10">
          <LocaleSwitcher />
        </div>
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6 mt-8">
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
            <CardTitle className="text-2xl">{t('forgotTitle')}</CardTitle>
            <CardDescription>{t('forgotSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
                <p className="text-sm text-muted-foreground">
                  {t('resetLinkSentTo', { email })}
                </p>
                {demoToken && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{t('demoTokenLabel')}</p>
                    <code className="text-sm font-mono break-all">{demoToken}</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('openResetPath', { path: `/reset-password?token=${demoToken}` })}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/reset-password${demoToken ? `?token=${demoToken}` : ''}`)}
                >
                  {t('goToResetPage')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">{tc('email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-9"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('sending')}</> : t('sendResetLink')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
