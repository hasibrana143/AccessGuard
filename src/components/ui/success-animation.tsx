'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
  variant?: 'checkmark' | 'confetti' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SuccessAnimation({
  show,
  onComplete,
  variant = 'checkmark',
  size = 'md',
  className,
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn('flex items-center justify-center', className)}
        >
          {variant === 'checkmark' && (
            <motion.div
              className={cn(
                'rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center',
                sizeClasses[size]
              )}
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <CheckCircle
                  className={cn('text-green-600 dark:text-green-400', iconSizeClasses[size])}
                />
              </motion.div>
            </motion.div>
          )}

          {variant === 'confetti' && (
            <div className="relative">
              {/* Center checkmark */}
              <motion.div
                className={cn(
                  'rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center',
                  sizeClasses[size]
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle
                  className={cn('text-green-600 dark:text-green-400', iconSizeClasses[size])}
                />
              </motion.div>

              {/* Confetti particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 8) * 40,
                    y: Math.sin((i * Math.PI * 2) / 8) * 40,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                >
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                </motion.div>
              ))}
            </div>
          )}

          {variant === 'pulse' && (
            <motion.div
              className={cn(
                'rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center',
                sizeClasses[size]
              )}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 10px rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{ duration: 1, repeat: 1 }}
            >
              <CheckCircle
                className={cn('text-green-600 dark:text-green-400', iconSizeClasses[size])}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inline success badge for buttons
interface SuccessBadgeProps {
  show: boolean;
  text?: string;
}

export function SuccessBadge({ show, text = 'Done!' }: SuccessBadgeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="inline-flex items-center gap-1 text-green-600 text-sm font-medium"
        >
          <CheckCircle className="h-4 w-4" />
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// Floating success toast
interface FloatingSuccessProps {
  show: boolean;
  message: string;
  onClose?: () => void;
}

export function FloatingSuccess({ show, message, onClose }: FloatingSuccessProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
