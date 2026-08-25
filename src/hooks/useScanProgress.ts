'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ScanProgress {
  status: string;
  pagesScanned: number;
  violationsFound: number;
  errorMessage?: string;
}

export function useScanProgress(scanId: string | null) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setProgress(null);
    setIsDone(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!scanId) return;

    const es = new EventSource(`/api/scans/progress?scanId=${scanId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgress({
            status: data.status,
            pagesScanned: data.pagesScanned,
            violationsFound: data.violationsFound,
            errorMessage: data.errorMessage,
          });
        } else if (data.type === 'done') {
          setIsDone(true);
          es.close();
        } else if (data.type === 'error') {
          setError(data.message);
          es.close();
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setError('Connection lost');
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [scanId]);

  return { progress, isDone, error, reset };
}
