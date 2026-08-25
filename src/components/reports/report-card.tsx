'use client';

import { Loader2, Download, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ReportType = 'report' | 'vpat' | 'summary';

interface ReportCardProps {
  type: ReportType;
  icon: React.ReactNode;
  color: string;
  generating: ReportType | null;
  onGenerate: (type: ReportType) => void;
  onShare: (type: ReportType) => void;
}

export function ReportCard({ type, icon, color, generating, onGenerate, onShare }: ReportCardProps) {
  const t = useTranslations('reports');

  const config: Record<ReportType, { title: string; desc: string; body: string; btnClass: string; downloadLabel: string }> = {
    report: { title: t('legalShield'), desc: t('legalShieldDesc'), body: t('legalShieldBody'), btnClass: 'bg-coral hover:bg-coral/90 text-coral-foreground', downloadLabel: t('generatePdfReport') },
    vpat: { title: t('vpat'), desc: t('vpatDesc'), body: t('vpatBody'), btnClass: 'bg-blue-700 hover:bg-blue-800 text-white', downloadLabel: t('generateVpat') },
    summary: { title: t('execSummary'), desc: t('execSummaryDesc'), body: t('execSummaryBody'), btnClass: 'bg-emerald-700 hover:bg-emerald-800 text-white', downloadLabel: t('generateSummary') },
  };

  const c = config[type];

  return (
    <Card className={`hover:border-${color}/30 transition-colors cursor-pointer`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-${color}/10`}>{icon}</div>
          <div>
            <CardTitle className="text-lg">{c.title}</CardTitle>
            <CardDescription>{c.desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{c.body}</p>
        <div className="flex gap-2">
          <Button className={`w-full ${c.btnClass}`} onClick={() => onGenerate(type)} disabled={generating !== null}>
            {generating === type ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />{c.downloadLabel}</>
            )}
          </Button>
          <Button variant="outline" onClick={() => onShare(type)} disabled={generating !== null}>
            <Share2 className="h-4 w-4 mr-2" />{t('share')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
