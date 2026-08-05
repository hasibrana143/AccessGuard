'use client';

import { useEffect, useRef, useState } from 'react';
import { useScans } from '@/hooks/useApi';
import { getPushState, showBrowserNotification, subscribePushPermissionChanges } from '@/lib/push';

export function PushNotificationCenter() {
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
        showBrowserNotification('Scan Completed', {
          body: `${scan.project?.name || 'Project'}: ${scan.violationsFound} violations found across ${scan.pagesScanned} pages`,
        });
      }
    }
  }, [scans, permissionTick]);

  return null;
}
