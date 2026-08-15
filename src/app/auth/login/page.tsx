'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LocaleSwitcher />
      </div>
      <LoginForm
        onBack={() => router.push('/')}
        onSwitchToRegister={() => router.push('/auth/register')}
      />
    </div>
  );
}
