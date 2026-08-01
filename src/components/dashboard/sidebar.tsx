'use client';

import React from 'react';
import { Shield, BarChart3, Globe, AlertTriangle, Activity, FileText, Settings, X, LogOut, MoreHorizontal, CreditCard, Users, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import type { View, User } from '@/types';

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  isMobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export function Sidebar({ activeView, onNavigate, isMobile, onClose, user, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: BarChart3 },
    { id: 'projects' as View, label: 'Projects', icon: Globe },
    { id: 'violations' as View, label: 'Violations', icon: AlertTriangle },
    { id: 'scans' as View, label: 'Scan History', icon: Activity },
    { id: 'reports' as View, label: 'Reports', icon: FileText },
    { id: 'audit-logs' as View, label: 'Audit Logs', icon: ShieldCheck },
    { id: 'team' as View, label: 'Team', icon: Users },
    ...(user?.role === 'admin' || user?.role === 'owner' ? [{ id: 'admin' as View, label: 'Admin', icon: Settings }] : []),
    { id: 'settings' as View, label: 'Settings', icon: Settings },
  ];

  const bottomItems = [
    { id: 'pricing', label: 'Plans & Billing', icon: CreditCard },
  ];

  return (
    <div className={`flex flex-col h-full bg-sidebar ${isMobile ? '' : 'w-64 border-r border-sidebar-border'}`}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-coral" />
            <span className="text-lg font-bold">AccessGuard</span>
          </div>
          {isMobile && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 ${
                activeView === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`}
              onClick={() => {
                onNavigate(item.id);
                if (isMobile && onClose) onClose();
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-2 mt-2 space-y-1">
          {bottomItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={() => {
                window.location.href = '/pricing';
                if (isMobile && onClose) onClose();
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
          <ThemeToggle />
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-coral/20 text-coral text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
