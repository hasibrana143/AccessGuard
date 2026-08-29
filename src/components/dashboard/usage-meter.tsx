'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Gauge, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface UsageMeterProps {
  orgId: string;
  initialUsage?: {
    pagesUsed: number;
    pagesQuota: number;
    usagePercentage: number;
    isOverQuota: boolean;
  };
  compact?: boolean;
}

export function UsageMeter({ 
  orgId, 
  initialUsage, 
  compact = false 
}: UsageMeterProps) {
  const t = useTranslations('usageMeter');
  const [usage, setUsage] = useState(initialUsage);
  const [loading, setLoading] = useState(!initialUsage);

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgId}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsage(data.data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialUsage) {
      fetchUsage();
    }
  }, [orgId, initialUsage]);

  // Refresh usage every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  if (loading && !initialUsage) {
    return (
      <div className="h-6 w-full animate-pulse bg-muted rounded" />
    );
  }

  if (!usage) return null;

  const { pagesUsed, pagesQuota, usagePercentage, isOverQuota } = usage;
  const remainingPages = Math.max(0, pagesQuota - pagesUsed);
  const isFreeTier = pagesQuota <= 1000;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Progress 
          value={usagePercentage} 
          className="w-32 h-2" 
          color={isOverQuota ? 'destructive' : usagePercentage > 80 ? 'warning' : 'default'}
        />
        <span className="text-xs text-muted-foreground">
          {pagesUsed.toLocaleString()} / {pagesQuota.toLocaleString()}
        </span>
        {isOverQuota && (
          <AlertTriangle className="w-3 h-3 text-destructive" />
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${isOverQuota ? 'border-destructive/50 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-lg">{t('monthlyUsage')}</h3>
            {isFreeTier && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {t('freeTier')}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('pagesScanned')}</span>
              <span className="font-mono font-medium">
                {pagesUsed.toLocaleString()} / {pagesQuota.toLocaleString()}
              </span>
            </div>
            
            <Progress 
              value={usagePercentage} 
              className="h-3" 
              color={isOverQuota ? 'destructive' : usagePercentage > 80 ? 'warning' : 'default'}
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('remaining')}</span>
              <span className="font-mono font-medium text-destructive">
                {remainingPages.toLocaleString()} {t('pagesLeft')}
              </span>
            </div>
          </div>

          {isOverQuota && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('quotaExceeded')}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('quotaExceededDesc')}
              </p>
            </div>
          )}

          {usagePercentage > 80 && !isOverQuota && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('approachingLimit')}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('approachingLimitDesc')}
              </p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          {isFreeTier && (
            <Button 
              asChild 
              variant="default" 
              className="w-full sm:w-auto"
              size="sm"
            >
              <Link href="/dashboard/settings?tab=billing">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                {t('upgrade')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}