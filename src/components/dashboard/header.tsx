'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, Bell, HelpCircle, Settings, LogOut, ChevronDown, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/constants';
import type { User } from '@/types';

interface DashboardHeaderProps {
  onMenuClick: () => void;
  user?: User | null;
  onLogout?: () => void;
}

interface AuditNotification {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, string>;
}

const NOTIFICATION_ACTIONS = new Set([
  'scan.started',
  'scan.completed',
  'scan.failed',
  'scan.blocked_plan_limit',
  'github.pr_created',
  'remediation_generated',
  'violation_status_changed',
  'team.invite_sent',
  'member_invited', // legacy
]);

export function DashboardHeader({ onMenuClick, user, onLogout }: DashboardHeaderProps) {
  const router = useRouter();
  const { user: authUser, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AuditNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [branding, setBranding] = useState<{ logoUrl?: string; displayName?: string; primaryColor?: string } | null>(null);

  useEffect(() => {
    if (!authUser?.orgId) return;
    let cancelled = false;
    fetch(`/api/settings?orgId=${encodeURIComponent(authUser.orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const branding = data.data?.settings?.branding;
        if (branding) {
          setBranding(branding);
          if (branding.primaryColor) {
            document.documentElement.style.setProperty('--primary', branding.primaryColor);
            document.documentElement.style.setProperty('--coral', branding.primaryColor);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authUser?.orgId]);

  useEffect(() => {
    if (!authUser?.orgId || !isAdmin) return;
    let cancelled = false;
    setNotificationsLoading(true);
    fetch(`/api/audit-logs?limit=8&orgId=${encodeURIComponent(authUser.orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setNotifications((data.data || []).filter((n: AuditNotification) => NOTIFICATION_ACTIONS.has(n.action)));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setNotificationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.orgId]);

  const formatAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          {branding && (branding.logoUrl || branding.displayName) && (
            <div className="hidden md:flex items-center gap-2 min-w-0" aria-label="Branding">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Organization logo" className="h-7 w-7 object-contain rounded" />
              ) : null}
              {branding.displayName ? (
                <span className="font-semibold truncate max-w-[160px]">{branding.displayName}</span>
              ) : null}
            </div>
          )}
          <div className="relative hidden sm:block">
            <Label htmlFor="header-search" className="sr-only">Search violations and projects</Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="header-search"
              placeholder="Search violations, projects..."
              className="w-72 pl-9 bg-muted/50"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-coral" aria-hidden="true" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No recent activity</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2 cursor-default">
                      <span className="text-sm">{formatAction(n.action)}</span>
                      <span className="text-xs text-muted-foreground">
                        {n.metadata?.projectName
                          ? n.metadata.projectName + ' · '
                          : ''}
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/audit-logs')} className="justify-center text-sm">
                View all activity
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Help and support" onClick={() => window.open('https://github.com', '_blank', 'noopener,noreferrer')}>
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help & Support</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-coral/10 text-coral text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{user?.name || 'User'}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/pricing')}>
                <CreditCard className="h-4 w-4 mr-2" />
                Pricing & Plans
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-500 focus:text-red-500">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
