'use client';

import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AIFixRateProps {
  fixRate?: { withFix: number; total: number; percentage: number };
}

export function AIFixRate({ fixRate }: AIFixRateProps) {
  const { withFix = 0, total = 0, percentage = 0 } = fixRate || {};

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-coral" />
          AI Fix Rate
        </CardTitle>
        <CardDescription>Violations with AI-generated remediation code</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold">{percentage}%</span>
          <span className="text-sm text-muted-foreground">
            {withFix} of {total} violations
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Progress value={percentage} className="h-2" aria-label={`AI fix rate: ${percentage}%`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {percentage}% of detected violations have a ready-to-apply AI fix
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
