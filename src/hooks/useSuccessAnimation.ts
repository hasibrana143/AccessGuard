'use client';

import { useState, useCallback } from 'react';

type AnimationVariant = 'checkmark' | 'confetti' | 'pulse';

interface UseSuccessAnimationOptions {
  duration?: number;
  variant?: AnimationVariant;
  onComplete?: () => void;
}

interface UseSuccessAnimationReturn {
  show: boolean;
  variant: AnimationVariant;
  trigger: (variant?: AnimationVariant) => void;
  reset: () => void;
}

export function useSuccessAnimation(
  options: UseSuccessAnimationOptions = {}
): UseSuccessAnimationReturn {
  const { duration = 2000, variant = 'checkmark', onComplete } = options;
  const [show, setShow] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<AnimationVariant>(variant);

  const trigger = useCallback(
    (newVariant?: AnimationVariant) => {
      if (newVariant) {
        setCurrentVariant(newVariant);
      }
      setShow(true);
      setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, duration);
    },
    [duration, onComplete]
  );

  const reset = useCallback(() => {
    setShow(false);
  }, []);

  return {
    show,
    variant: currentVariant,
    trigger,
    reset,
  };
}
