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

export function setPushEnabled(enabled: boolean): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    localStorage.setItem(PUSH_STORAGE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

export function getPushPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
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
