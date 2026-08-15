'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface TrendItem {
  date: string;
  critical?: number;
  serious?: number;
  moderate?: number;
  minor?: number;
  total?: number;
}

interface TrendChartProps {
  trendData: TrendItem[];
}

export function TrendChart({ trendData }: TrendChartProps) {
  const t = useTranslations('dash');
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('violationTrends')}</CardTitle>
            <CardDescription>{t('violationHistory')}</CardDescription>
          </div>
          <Select defaultValue="30">
            <SelectTrigger className="w-32" aria-label={t('trendRangeLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('days', { count: 7 })}</SelectItem>
              <SelectItem value="30">{t('days', { count: 30 })}</SelectItem>
              <SelectItem value="90">{t('days', { count: 90 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} accessibilityLayer role="img" aria-label={t('chartAria')}>
              <defs>
                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--coral)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--coral)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="violations"
                stroke="var(--coral)"
                fillOpacity={1}
                fill="url(#colorViolations)"
                strokeWidth={2}
              />
              <Line type="monotone" dataKey="critical" stroke="var(--critical)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="serious" stroke="var(--serious)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-coral" />
            <span className="text-muted-foreground">{t('total')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500" />
            <span className="text-muted-foreground">{t('critical')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-orange-500" />
            <span className="text-muted-foreground">{t('serious')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
