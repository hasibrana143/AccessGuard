'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Command } from 'cmdk';
import {
  BarChart3,
  Globe,
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  Users,
  ShieldCheck,
  Moon,
  Sun,
  Search,
  Plus,
  RefreshCw,
  LogOut,
  ExternalLink,
  Keyboard,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'settings' | 'help';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();

  // Toggle command palette
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { ...COMMON_SHORTCUTS.COMMAND_PALETTE, action: toggle },
    { ...COMMON_SHORTCUTS.GO_DASHBOARD, action: () => router.push('/dashboard') },
    { ...COMMON_SHORTCUTS.GO_PROJECTS, action: () => router.push('/projects') },
    { ...COMMON_SHORTCUTS.GO_VIOLATIONS, action: () => router.push('/violations') },
    { ...COMMON_SHORTCUTS.GO_SCANS, action: () => router.push('/scans') },
    { ...COMMON_SHORTCUTS.GO_REPORTS, action: () => router.push('/reports') },
    { ...COMMON_SHORTCUTS.GO_SETTINGS, action: () => router.push('/settings') },
    {
      ...COMMON_SHORTCUTS.TOGGLE_THEME,
      action: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    },
  ]);

  // Build command items
  const items: CommandItem[] = useMemo(() => {
    const navItems: CommandItem[] = [
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        icon: BarChart3,
        shortcut: '⌘1',
        action: () => router.push('/dashboard'),
        category: 'navigation',
      },
      {
        id: 'nav-projects',
        label: 'Projects',
        icon: Globe,
        shortcut: '⌘2',
        action: () => router.push('/projects'),
        category: 'navigation',
      },
      {
        id: 'nav-violations',
        label: 'Violations',
        icon: AlertTriangle,
        shortcut: '⌘3',
        action: () => router.push('/violations'),
        category: 'navigation',
      },
      {
        id: 'nav-scans',
        label: 'Scans',
        icon: Activity,
        shortcut: '⌘4',
        action: () => router.push('/scans'),
        category: 'navigation',
      },
      {
        id: 'nav-reports',
        label: 'Reports',
        icon: FileText,
        shortcut: '⌘5',
        action: () => router.push('/reports'),
        category: 'navigation',
      },
      {
        id: 'nav-audit-logs',
        label: 'Audit Logs',
        icon: ShieldCheck,
        action: () => router.push('/audit-logs'),
        category: 'navigation',
      },
      {
        id: 'nav-team',
        label: 'Team',
        icon: Users,
        action: () => router.push('/team'),
        category: 'navigation',
      },
    ];

    if (isAdmin) {
      navItems.push({
        id: 'nav-admin',
        label: 'Admin',
        icon: Settings,
        action: () => router.push('/admin'),
        category: 'navigation',
      });
    }

    navItems.push({
      id: 'nav-settings',
      label: 'Settings',
      icon: Settings,
      shortcut: '⌘,',
      action: () => router.push('/settings'),
      category: 'navigation',
    });

    const actionItems: CommandItem[] = [
      {
        id: 'action-new-project',
        label: 'New Project',
        icon: Plus,
        shortcut: '⌘N',
        action: () => router.push('/projects?new=true'),
        category: 'actions',
      },
      {
        id: 'action-refresh',
        label: 'Refresh Data',
        icon: RefreshCw,
        shortcut: '⌘R',
        action: () => window.location.reload(),
        category: 'actions',
      },
      {
        id: 'action-theme',
        label: 'Toggle Dark Mode',
        icon: Moon,
        shortcut: '⌘⇧D',
        action: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
        category: 'settings',
      },
      {
        id: 'action-docs',
        label: 'API Documentation',
        icon: ExternalLink,
        action: () => window.open('/api/docs', '_blank'),
        category: 'help',
      },
      {
        id: 'action-shortcuts',
        label: 'Keyboard Shortcuts',
        icon: Keyboard,
        action: () => {}, // Could open a shortcuts modal
        category: 'help',
      },
      {
        id: 'action-logout',
        label: 'Sign Out',
        icon: LogOut,
        action: () => logout(),
        category: 'actions',
      },
    ];

    return [...navItems, ...actionItems];
  }, [router, setTheme, logout, isAdmin]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [items, search]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
    setSearch('');
  }, [pathname]);

  // Handle selection
  const handleSelect = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      item.action();
      setOpen(false);
      setSearch('');
    }
  }, [items]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background border rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command palette dialog */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
          <div className="w-full max-w-lg bg-background border rounded-xl shadow-elevation-3 overflow-hidden">
            <Command
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            >
              <div className="flex items-center border-b px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Type a command or search..."
                  className="flex-1 py-3 px-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="px-1.5 py-0.5 text-xs text-muted-foreground bg-muted border rounded">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <Command.Group key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
                    {categoryItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item.id)}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-accent"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-xs text-muted-foreground bg-muted border rounded">
                            {item.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}

// Export keyboard shortcuts reference for help modal
export const SHORTCUT_REFERENCE = [
  { keys: ['⌘', 'K'], description: 'Open command palette' },
  { keys: ['⌘', '1'], description: 'Go to Dashboard' },
  { keys: ['⌘', '2'], description: 'Go to Projects' },
  { keys: ['⌘', '3'], description: 'Go to Violations' },
  { keys: ['⌘', '4'], description: 'Go to Scans' },
  { keys: ['⌘', '5'], description: 'Go to Reports' },
  { keys: ['⌘', ','], description: 'Go to Settings' },
  { keys: ['⌘', '⇧', 'D'], description: 'Toggle dark mode' },
  { keys: ['⌘', 'N'], description: 'New project' },
  { keys: ['⌘', 'R'], description: 'Refresh data' },
  { keys: ['Esc'], description: 'Close dialog / palette' },
];
