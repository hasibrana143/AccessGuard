'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureAnalytics, identifyUser, isPostHogConfigured } from '@/lib/posthog';

interface PostHogContextType {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, traits?: Record<string, unknown>) => void;
  isConfigured: boolean;
}

const PostHogContext = createContext<PostHogContextType>({
  capture: () => {},
  identify: () => {},
  isConfigured: false,
});

export function usePostHog() {
  return useContext(PostHogContext);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views on route changes
  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      captureAnalytics('$pageview', {
        $current_url: url,
        pathname,
      });
    }
  }, [pathname, searchParams]);

  const value = useMemo(
    () => ({
      capture: (event: string, properties?: Record<string, unknown>) => {
        captureAnalytics(event, properties);
      },
      identify: (distinctId: string, traits?: Record<string, unknown>) => {
        identifyUser(distinctId, traits);
      },
      isConfigured: isPostHogConfigured(),
    }),
    []
  );

  return <PostHogContext.Provider value={value}>{children}</PostHogContext.Provider>;
}
