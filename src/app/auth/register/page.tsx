'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LocaleSwitcher />
      </div>
      <RegisterForm
        onBack={() => router.push('/')}
        onSwitchToLogin={() => router.push('/auth/login')}
      />
    </div>
  );
}
