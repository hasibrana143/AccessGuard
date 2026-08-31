import { useState, useCallback } from 'react';
import { AccessGuardSDK } from './sdk';
import type { ScanConfig, ScanResult, Violation } from './types';

export function useAccessGuard(config: ScanConfig) {
  const [sdk] = useState(() => new AccessGuardSDK(config));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const scanUrl = useCallback(async (url: string): Promise<ScanResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await sdk.scanUrl(url);
      setLastResult(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const scanHtml = useCallback(async (html: string, filePath?: string): Promise<ScanResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await sdk.scanHtml(html, filePath);
      setLastResult(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const checkCompliance = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await sdk.checkCompliance(url);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const clearError = useCallback(() => setError(null), []);

  return {
    sdk,
    loading,
    error,
    lastResult,
    scanUrl,
    scanHtml,
    checkCompliance,
    clearError,
  };
}
