'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useScans } from '@/hooks/useApi';
import { getPushState, showBrowserNotification, subscribePushPermissionChanges } from '@/lib/push';

export function PushNotificationCenter() {
  const t = useTranslations('dash');
  const { data: scans } = useScans(undefined, 10);
  const notifiedRef = useRef<Set<string>>(new Set());
  const [permissionTick, setPermissionTick] = useState(0);

  useEffect(() => {
    return subscribePushPermissionChanges(() => setPermissionTick((t) => t + 1));
  }, []);

  useEffect(() => {
    // Only fire when the user intent AND the browser permission are both on
    if (!getPushState().effective || !Array.isArray(scans)) return;

    for (const scan of scans) {
      if (scan.status === 'completed' && !notifiedRef.current.has(scan.id)) {
        notifiedRef.current.add(scan.id);
        showBrowserNotification(t('scanCompletedTitle'), {
          body: t('scanCompletedBody', {
            project: scan.project?.name || t('project'),
            violations: scan.violationsFound,
            pages: scan.pagesScanned,
          }),
        });
      }
    }
  }, [scans, permissionTick, t]);

  return null;
}
