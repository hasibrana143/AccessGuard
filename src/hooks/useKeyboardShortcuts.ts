'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const metaMatch = shortcut.meta ? e.metaKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;
        const altMatch = shortcut.alt ? e.altKey : true;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // For Ctrl/Cmd shortcuts, we need either ctrl or meta to be pressed
        if (shortcut.ctrl || shortcut.meta) {
          if (!(e.ctrlKey || e.metaKey)) continue;
        }

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcuts configuration
export const COMMON_SHORTCUTS = {
  COMMAND_PALETTE: { key: 'k', meta: true, description: 'Open command palette' },
  GO_DASHBOARD: { key: '1', meta: true, description: 'Go to Dashboard' },
  GO_PROJECTS: { key: '2', meta: true, description: 'Go to Projects' },
  GO_VIOLATIONS: { key: '3', meta: true, description: 'Go to Violations' },
  GO_SCANS: { key: '4', meta: true, description: 'Go to Scans' },
  GO_REPORTS: { key: '5', meta: true, description: 'Go to Reports' },
  GO_SETTINGS: { key: ',', meta: true, description: 'Go to Settings' },
  TOGGLE_THEME: { key: 'd', meta: true, shift: true, description: 'Toggle dark mode' },
  SEARCH: { key: '/', meta: true, description: 'Focus search' },
} as const;
