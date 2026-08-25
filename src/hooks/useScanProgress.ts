'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ScanProgress {
  status: string;
  pagesScanned: number;
  violationsFound: number;
  errorMessage?: string;
  summary?: Record<string, number>;
}

interface UseScanProgressOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useScanProgress(
  scanId: string | null,
  options: UseScanProgressOptions = {}
) {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 3,
    reconnectInterval = 3000,
  } = options;

  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reset = useCallback(() => {
    setProgress(null);
    setIsDone(false);
    setError(null);
    reconnectCountRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    if (!scanId) return;

    cleanup();

    try {
      const es = new EventSource(`/api/scans/progress?scanId=${scanId}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            setProgress({
              status: data.status,
              pagesScanned: data.pagesScanned,
              violationsFound: data.violationsFound,
              errorMessage: data.errorMessage,
              summary: data.summary,
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
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Auto-reconnect with exponential backoff
        if (autoReconnect && reconnectCountRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectCountRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connectRef.current();
          }, Math.min(delay, 15000));
        } else {
          setError('Connection lost');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [scanId, autoReconnect, maxReconnectAttempts, reconnectInterval, cleanup]);

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { progress, isDone, error, isConnected, reset, reconnect };
}
