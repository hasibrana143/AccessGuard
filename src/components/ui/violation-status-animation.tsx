'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Ban, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViolationStatus } from '@/types';

interface ViolationStatusAnimationProps {
  status: ViolationStatus;
  previousStatus?: ViolationStatus;
  show?: boolean;
  className?: string;
}

const statusConfig: Record<ViolationStatus, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  open: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Open' },
  fixed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Fixed' },
  ignored: { icon: Ban, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30', label: 'Ignored' },
  false_positive: { icon: ArrowUpCircle, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'False Positive' },
};

export function ViolationStatusAnimation({
  status,
  previousStatus,
  show = true,
  className,
}: ViolationStatusAnimationProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const hasChanged = previousStatus && previousStatus !== status;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            key={status}
            initial={hasChanged ? { opacity: 0, scale: 0.5, rotate: -180 } : false}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn('h-6 w-6 rounded-full flex items-center justify-center', config.bgColor)}
          >
            <Icon className={cn('h-3 w-3', config.color)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {hasChanged && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="text-xs text-muted-foreground"
          >
            {statusConfig[previousStatus].label} → {config.label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
