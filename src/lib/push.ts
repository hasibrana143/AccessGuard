'use client';

export const PUSH_STORAGE_KEY = 'accessguard-push-enabled';

export function isPushEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PUSH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushPermission(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// Effective push state is the stored intent AND the actual browser permission.
// A stored "true" with a revoked/denied permission must never be reported as on.
export function getPushState(): { stored: boolean; permission: PushPermission; effective: boolean } {
  const stored = isPushEnabled();
  const permission = getPushPermission();
  return { stored, permission, effective: stored && permission === 'granted' };
}

// Enable/disable push. Enabling awaits the permission prompt and persists ONLY
// when the browser actually granted it — the setting can no longer show "on"
// while the permission is blocked. Disabling always persists the intent.
export async function setPushEnabled(enabled: boolean): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (enabled) {
      const permission = getPushPermission();
      if (permission === 'denied' || permission === 'unsupported') return false;
      if (permission === 'default' && 'Notification' in window) {
        const granted = (await Notification.requestPermission()) === 'granted';
        if (!granted) {
          localStorage.setItem(PUSH_STORAGE_KEY, 'false');
          return false;
        }
      }
    }
    localStorage.setItem(PUSH_STORAGE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

// Subscribe to browser permission changes (grant/revoke from browser UI) so the
// UI stays honest without a reload. Returns an unsubscribe function.
export function subscribePushPermissionChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !('Notification' in window)) return () => {};
  window.addEventListener('permissionchange', onChange);
  return () => window.removeEventListener('permissionchange', onChange);
}

export function showBrowserNotification(title: string, options?: { body?: string; icon?: string }): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted' && isPushEnabled()) {
    try {
      new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/logo.svg',
      });
    } catch {
      // ignore
    }
  }
}