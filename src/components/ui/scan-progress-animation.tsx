'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanProgressAnimationProps {
  status: 'pending' | 'running' | 'completed' | 'failed';
  pagesScanned?: number;
  violationsFound?: number;
  className?: string;
}

export function ScanProgressAnimation({
  status,
  pagesScanned = 0,
  violationsFound = 0,
  className,
}: ScanProgressAnimationProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (status === 'running') {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <AnimatePresence mode="wait">
        {status === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
          >
            <Scan className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        )}

        {status === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative"
          >
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 h-10 w-10 rounded-full border-2 border-blue-500"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 8px rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{ duration: 0.6 }}
            >
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </motion.div>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {status === 'pending' && 'Queued'}
          {status === 'running' && `Scanning${dots}`}
          {status === 'completed' && 'Completed'}
          {status === 'failed' && 'Failed'}
        </p>
        {(status === 'running' || status === 'completed') && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground"
          >
            {pagesScanned} pages scanned
            {violationsFound > 0 && ` · ${violationsFound} violations`}
          </motion.p>
        )}
      </div>
    </div>
  );
}
