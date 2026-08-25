'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface SSEOptions {
  url: string;
  enabled?: boolean;
  onMessage?: (data: Record<string, unknown>) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface SSEReturn<T> {
  data: T | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useSSE<T = Record<string, unknown>>({
  url,
  enabled = true,
  onMessage,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: SSEOptions): SSEReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    cleanup();

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as T;
          setData(parsed);
          if (onMessage) {
            onMessage(parsed as Record<string, unknown>);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = (err) => {
        setIsConnected(false);
        setError('Connection lost');

        if (onError) {
          onError(err);
        }

        es.close();
        eventSourceRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectCountRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectCountRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connectRef.current();
          }, Math.min(delay, 30000));
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [url, enabled, onMessage, onError, reconnectInterval, maxReconnectAttempts, cleanup]);

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connectRef.current = connect;
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { data, isConnected, error, reconnect };
}

// Dashboard-specific SSE hook
interface DashboardEvent {
  type: 'scan_complete' | 'violation_found' | 'project_added' | 'connected' | 'error';
  data?: Record<string, unknown>;
}

export function useDashboardSSE(orgId: string | undefined) {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { data, isConnected: sseConnected, reconnect } = useSSE<DashboardEvent>({
    url: orgId ? `/api/sse/dashboard?orgId=${encodeURIComponent(orgId)}` : '',
    enabled: !!orgId,
    onMessage: (msg) => {
      const event = msg as unknown as DashboardEvent;
      setEvents((prev) => [...prev.slice(-50), event]); // Keep last 50 events
    },
  });

  useEffect(() => {
    setIsConnected(sseConnected);
  }, [sseConnected]);

  return { events, isConnected, reconnect };
}

// Violations live feed hook
interface ViolationEvent {
  type: 'new_violation' | 'violation_fixed' | 'connected' | 'error';
  violation?: Record<string, unknown>;
}

export function useViolationsSSE() {
  const [newViolations, setNewViolations] = useState<Record<string, unknown>[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { data, isConnected: sseConnected, reconnect } = useSSE<ViolationEvent>({
    url: '/api/sse/violations',
    onMessage: (msg) => {
      const event = msg as unknown as ViolationEvent;
      if (event.type === 'new_violation' && event.violation) {
        setNewViolations((prev) => [event.violation!, ...prev.slice(0, 49)]);
      }
    },
  });

  useEffect(() => {
    setIsConnected(sseConnected);
  }, [sseConnected]);

  const clearNewViolations = useCallback(() => {
    setNewViolations([]);
  }, []);

  return { newViolations, isConnected, reconnect, clearNewViolations };
}
