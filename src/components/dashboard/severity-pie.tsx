'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { SEVERITY_COLORS } from '@/lib/constants';

interface SeverityPieProps {
  stats: { critical: number; serious: number; moderate: number; minor: number };
}

export function SeverityPie({ stats }: SeverityPieProps) {
  const t = useTranslations('dash');
  const pieData = [
    { name: t('critical'), value: stats.critical, color: SEVERITY_COLORS.critical },
    { name: t('serious'), value: stats.serious, color: SEVERITY_COLORS.serious },
    { name: t('moderate'), value: stats.moderate, color: SEVERITY_COLORS.moderate },
    { name: t('minor'), value: stats.minor, color: SEVERITY_COLORS.minor },
  ].filter(d => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('severityDistribution')}</CardTitle>
        <CardDescription>{t('currentOpenViolations')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart role="img" aria-label={t('pieAria')}>
              <Pie
                data={pieData.length > 0 ? pieData : [{ name: t('none'), value: 1, color: '#888' }]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {(pieData.length > 0 ? pieData : [{ name: t('none'), value: 1, color: '#888' }]).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} aria-label={`${entry.name}: ${entry.value}`} />
                ))}
              </Pie>
              <RechartsTooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            { label: t('critical'), value: stats.critical, color: SEVERITY_COLORS.critical },
            { label: t('serious'), value: stats.serious, color: SEVERITY_COLORS.serious },
            { label: t('moderate'), value: stats.moderate, color: SEVERITY_COLORS.moderate },
            { label: t('minor'), value: stats.minor, color: SEVERITY_COLORS.minor },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-sm font-semibold">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
