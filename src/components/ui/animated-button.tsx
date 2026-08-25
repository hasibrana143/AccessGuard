'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  success?: boolean;
  successText?: string;
  loadingText?: string;
}

export function AnimatedButton({
  loading = false,
  success = false,
  successText,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <Button
      className={cn('relative overflow-hidden', className)}
      disabled={disabled || loading}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || 'Loading...'}
          </motion.span>
        )}

        {showSuccess && !loading && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-2 text-green-600"
          >
            <CheckCircle className="h-4 w-4" />
            {successText || 'Done!'}
          </motion.span>
        )}

        {!loading && !showSuccess && (
          <motion.span
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
