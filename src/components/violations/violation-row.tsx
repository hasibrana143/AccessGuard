'use client';

import { AlertTriangle, AlertCircle, Globe, Code, Clock, Sparkles, ExternalLink, CheckSquare, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getSeverityBadge, getStatusBadge, formatRelativeTime, SEVERITY_BG, SEVERITY_TEXT } from '@/lib/constants';
import type { Violation } from '@/types';

interface ViolationRowProps {
  violation: Violation;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewFix: () => void;
}

export function ViolationRow({ violation, isSelected, onToggleSelect, onViewFix }: ViolationRowProps) {
  const t = useTranslations('violations');

  return (
    <Card className={`hover:border-coral/30 transition-colors cursor-pointer group ${isSelected ? 'ring-1 ring-coral/40 border-coral/30' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 pt-1" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-coral cursor-pointer" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer" />
            )}
          </div>
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${SEVERITY_BG[violation.severity]}`}>
            {violation.severity === 'critical' ? (
              <AlertCircle className={`h-5 w-5 ${SEVERITY_TEXT[violation.severity]}`} />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${SEVERITY_TEXT[violation.severity]}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold">
                {violation.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <Badge variant="outline" className={`text-xs ${getSeverityBadge(violation.severity)}`}>{violation.severity}</Badge>
              <Badge variant="outline" className="text-xs">WCAG {violation.wcagCriteria}</Badge>
              <Badge variant="outline" className={`text-xs ${getStatusBadge(violation.status)}`}>{violation.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{violation.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span className="truncate max-w-md">{violation.url}</span>
              </div>
              <div className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                <span className="truncate max-w-xs">{violation.elementSelector}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(violation.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {violation.aiConfidenceScore && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {Math.round(violation.aiConfidenceScore * 100)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{t('aiConfidenceScore')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {violation.githubPrUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label={t('viewPullRequest')} className="text-coral hover:text-coral" onClick={(e) => { e.stopPropagation(); window.open(violation.githubPrUrl!, '_blank', 'noopener,noreferrer'); }}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('viewPullRequest')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onViewFix(); }}>
              {t('viewFix')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
