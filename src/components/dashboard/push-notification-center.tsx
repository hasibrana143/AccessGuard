'use client';

import { useEffect, useRef } from 'react';
import { useScans } from '@/hooks/useApi';
import { isPushEnabled, showBrowserNotification } from '@/lib/push';

export function PushNotificationCenter() {
  const { data: scans } = useScans(undefined, 10);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPushEnabled() || !Array.isArray(scans)) return;

    for (const scan of scans) {
      if (scan.status === 'completed' && !notifiedRef.current.has(scan.id)) {
        notifiedRef.current.add(scan.id);
        showBrowserNotification('Scan Completed', {
          body: `${scan.project?.name || 'Project'}: ${scan.violationsFound} violations found across ${scan.pagesScanned} pages`,
        });
      }
    }
  }, [scans]);

  return null;
}
