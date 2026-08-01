'use client';

import React, { useState } from 'react';
import { Shield, Loader2, Mail, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { PushNotificationCenter } from '@/components/dashboard/push-notification-center';
import type { View } from '@/types';

const viewMap: Record<string, View> = {
  '/dashboard': 'dashboard',
  '/projects': 'projects',
  '/violations': 'violations',
  '/scans': 'scans',
  '/reports': 'reports',
  '/audit-logs': 'audit-logs',
  '/team': 'team',
  '/admin': 'admin',
  '/settings': 'settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { user, logout, isAuthenticated, sessionValidated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const currentView: View = viewMap[pathname] || 'dashboard';

  const handleResendVerification = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Verification Email Sent',
          description: data.demoToken ? `Demo token: ${data.demoToken}` : 'Check your inbox.',
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resend', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send verification email', variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!sessionValidated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <Sidebar activeView={currentView} onNavigate={(v) => router.push(`/${v}`)} user={user} onLogout={logout} />
      </div>
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access main navigation options</SheetDescription>
          </SheetHeader>
          <Sidebar activeView={currentView} onNavigate={(v) => { router.push(`/${v}`); setIsSidebarOpen(false); }} isMobile onClose={() => setIsSidebarOpen(false)} user={user} onLogout={logout} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} user={user} onLogout={logout} />
        {user && !user.emailVerified && !bannerDismissed && (
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
                Your email <strong>{user.email}</strong> is not verified yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                onClick={handleResendVerification}
              >
                <Mail className="h-3 w-3 mr-1" />
                Resend Verification
              </Button>
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => setBannerDismissed(true)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <OnboardingWizard />
        <PushNotificationCenter />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
        <footer className="border-t border-border py-4 px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-coral" />
              <span>AccessGuard © {new Date().getFullYear()}</span>
            </div>
            <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Lawsuit Defense Ready™
            </Badge>
          </div>
        </footer>
      </div>
      <Toaster />
    </div>
  );
}
