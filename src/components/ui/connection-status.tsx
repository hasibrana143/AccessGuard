'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ isConnected, onReconnect, className }: ConnectionStatusProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AnimatePresence mode="wait">
        {isConnected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              className="h-2 w-2 rounded-full bg-green-500"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 4px rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs text-green-600 dark:text-green-400">Live</span>
          </motion.div>
        ) : (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
            {onReconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReconnect}
                className="h-6 px-2"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for sidebar
export function ConnectionDot({ isConnected }: { isConnected: boolean }) {
  return (
    <motion.div
      className={cn(
        'h-2 w-2 rounded-full',
        isConnected ? 'bg-green-500' : 'bg-red-500'
      )}
      animate={
        isConnected
          ? {
              boxShadow: [
                '0 0 0 0 rgba(34, 197, 94, 0.4)',
                '0 0 0 4px rgba(34, 197, 94, 0)',
              ],
            }
          : {}
      }
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}
