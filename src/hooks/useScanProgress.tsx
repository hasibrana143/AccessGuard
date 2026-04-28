'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ScanProgress {
  scanId: string;
  projectId: string;
  projectName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentPage: string;
  pagesScanned: number;
  totalPages: number;
  violationsFound: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

interface UseScanProgressOptions {
  projectId?: string;
  pollInterval?: number;
  onScanStarted?: (progress: ScanProgress) => void;
  onScanProgress?: (progress: ScanProgress) => void;
  onScanCompleted?: (progress: ScanProgress) => void;
  onScanFailed?: (progress: ScanProgress) => void;
}

// In-memory store for demo purposes (simulates server state)
const activeScansStore = new Map<string, ScanProgress>();

export function useScanProgress(options: UseScanProgressOptions = {}) {
  const { projectId, pollInterval = 2000, onScanStarted, onScanProgress, onScanCompleted, onScanFailed } = options;
  const [activeScans, setActiveScans] = useState<ScanProgress[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simulate connection
    setIsConnected(true);

    // Poll for active scans
    const poll = () => {
      const scans = Array.from(activeScansStore.values());
      setActiveScans(scans);
    };

    poll();
    pollRef.current = setInterval(poll, pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [pollInterval]);

  // Start a scan progress
  const startScan = useCallback((data: { scanId: string; projectId: string; projectName: string; totalPages: number }) => {
    const progress: ScanProgress = {
      scanId: data.scanId,
      projectId: data.projectId,
      projectName: data.projectName,
      status: 'running',
      progress: 0,
      currentPage: '',
      pagesScanned: 0,
      totalPages: data.totalPages,
      violationsFound: 0,
      startTime: new Date(),
      errors: []
    };

    activeScansStore.set(data.scanId, progress);
    setActiveScans(Array.from(activeScansStore.values()));
    onScanStarted?.(progress);

    // Simulate progress updates
    let currentPage = 0;
    const interval = setInterval(() => {
      currentPage++;
      const scan = activeScansStore.get(data.scanId);
      if (!scan || scan.status !== 'running') {
        clearInterval(interval);
        return;
      }

      scan.currentPage = `Page ${currentPage}`;
      scan.pagesScanned = currentPage;
      scan.violationsFound = Math.floor(Math.random() * 3);
      scan.progress = Math.min(100, Math.round((currentPage / data.totalPages) * 100));

      activeScansStore.set(data.scanId, scan);
      setActiveScans(Array.from(activeScansStore.values()));
      onScanProgress?.(scan);

      if (currentPage >= data.totalPages) {
        scan.status = 'completed';
        scan.progress = 100;
        scan.endTime = new Date();
        activeScansStore.set(data.scanId, scan);
        setActiveScans(Array.from(activeScansStore.values()));
        onScanCompleted?.(scan);
        clearInterval(interval);
      }
    }, 500);
  }, [onScanStarted, onScanProgress, onScanCompleted]);

  // Update scan progress manually
  const updateProgress = useCallback((data: { 
    scanId: string; 
    currentPage?: string; 
    pagesScanned?: number;
    violationsFound?: number;
    progress?: number;
  }) => {
    const scan = activeScansStore.get(data.scanId);
    if (!scan) return;

    if (data.currentPage) scan.currentPage = data.currentPage;
    if (data.pagesScanned !== undefined) scan.pagesScanned = data.pagesScanned;
    if (data.violationsFound !== undefined) scan.violationsFound = data.violationsFound;
    if (data.progress !== undefined) scan.progress = data.progress;

    activeScansStore.set(data.scanId, scan);
    setActiveScans(Array.from(activeScansStore.values()));
    onScanProgress?.(scan);
  }, [onScanProgress]);

  // Complete a scan
  const completeScan = useCallback((data: { scanId: string; violationsFound: number }) => {
    const scan = activeScansStore.get(data.scanId);
    if (!scan) return;

    scan.status = 'completed';
    scan.progress = 100;
    scan.violationsFound = data.violationsFound;
    scan.endTime = new Date();

    activeScansStore.set(data.scanId, scan);
    setActiveScans(Array.from(activeScansStore.values()));
    onScanCompleted?.(scan);
  }, [onScanCompleted]);

  // Fail a scan
  const failScan = useCallback((data: { scanId: string; error: string }) => {
    const scan = activeScansStore.get(data.scanId);
    if (!scan) return;

    scan.status = 'failed';
    scan.errors.push(data.error);
    scan.endTime = new Date();

    activeScansStore.set(data.scanId, scan);
    setActiveScans(Array.from(activeScansStore.values()));
    onScanFailed?.(scan);
  }, [onScanFailed]);

  // Get progress for a specific scan
  const getScanProgress = useCallback((scanId: string): ScanProgress | undefined => {
    return activeScans.find(s => s.scanId === scanId);
  }, [activeScans]);

  // Get all active scans for a project
  const getProjectScans = useCallback((projId: string): ScanProgress[] => {
    return activeScans.filter(s => s.projectId === projId);
  }, [activeScans]);

  return {
    activeScans,
    isConnected,
    startScan,
    updateProgress,
    completeScan,
    failScan,
    getScanProgress,
    getProjectScans
  };
}

// Progress bar component
export function ScanProgressBar({ progress }: { progress: ScanProgress }) {
  const statusColors = {
    pending: 'bg-gray-500',
    running: 'bg-coral',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500'
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{progress.projectName}</span>
        <span className={`capitalize ${
          progress.status === 'completed' ? 'text-emerald-500' :
          progress.status === 'failed' ? 'text-red-500' :
          progress.status === 'running' ? 'text-coral' : 'text-muted-foreground'
        }`}>
          {progress.status}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${statusColors[progress.status]}`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {progress.pagesScanned} / {progress.totalPages} pages
          {progress.currentPage && ` - ${progress.currentPage}`}
        </span>
        <span>{progress.violationsFound} violations found</span>
      </div>
      {progress.errors.length > 0 && (
        <div className="text-xs text-red-500">
          {progress.errors.join(', ')}
        </div>
      )}
    </div>
  );
}
