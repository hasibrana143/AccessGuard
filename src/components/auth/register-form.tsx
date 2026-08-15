'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface RegisterFormProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onBack, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: tc('error'),
        description: t('passwordsMismatch'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: tc('error'),
        description: t('passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organizationName: organization }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('registerSuccess'),
          description: t('registerWelcome'),
        });
        const token = data.demoVerificationToken;
        if (token) {
          toast({
            title: t('verifyEmailTitle'),
            description: t('verifyEmailDemo', { token }),
          });
        } else {
          toast({
            title: t('verifyEmailTitle'),
            description: t('verifyEmailSent'),
          });
        }
        router.push('/dashboard');
      } else {
        toast({
          title: t('registrationFailed'),
          description: data.error || t('couldNotCreateAccount'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: tc('error'),
        description: t('serverError'),
        variant: 'destructive',
      });
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
            <CardTitle className="text-2xl">{t('signUp')}</CardTitle>
            <CardDescription>{t('registerSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="register-name">{t('registerFullName')}</Label>
                <Input id="register-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fullNamePlaceholder')} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">{tc('email')}</Label>
                <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-org">{t('registerOrgName')}</Label>
                <Input id="register-org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Acme Inc." autoComplete="organization" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">{tc('password')}</Label>
                <div className="relative">
                  <Input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('registerPasswordPlaceholder')} required autoComplete="new-password" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm">{tc('confirmPassword')}</Label>
                <div className="relative">
                  <Input id="register-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('registerConfirmPlaceholder')} required autoComplete="new-password" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-coral hover:bg-coral/90 text-coral-foreground h-11" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creatingAccount')}</> : t('signUp')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-xs text-center text-muted-foreground">
              {t('termsAgree')}{' '}
              <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/terms')}>{t('termsOfService')}</Button>
              {' '}{t('and')}{' '}
              <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/privacy')}>{t('privacyPolicy')}</Button>
            </p>
            <div className="text-sm text-muted-foreground">
              {t('haveAccount')}{' '}
              <Button variant="link" className="p-0 h-auto text-coral" onClick={onSwitchToLogin}>{t('signIn')}</Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
