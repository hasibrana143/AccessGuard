'use client';

import { Globe, Clock, Loader2, RefreshCw, Code, MoreHorizontal, Settings, Edit, Download, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getRiskColor, formatRelativeTime } from '@/lib/constants';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  isScanning: boolean;
  onScan: () => void;
  onHtmlUpload: () => void;
  onSettings: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, isScanning, onScan, onHtmlUpload, onSettings, onEdit, onDelete }: ProjectCardProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');

  const hostname = (() => {
    try { return new URL(project.url).hostname; } catch { return project.url; }
  })();

  return (
    <Card className="hover:border-coral/30 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {project.name}
              {project.riskScore != null && project.riskScore < 50 && (
                <Badge variant="outline" className="text-xs border-red-500/20 text-red-500">
                  {t('highRisk')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Globe className="h-3 w-3" />
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors">
                {hostname}
              </a>
            </CardDescription>
            {project.nextScheduledScan && (
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {t('nextScan')} {new Date(project.nextScheduledScan).toLocaleDateString()} {new Date(project.nextScheduledScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t('actionsFor', { name: project.name })}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onScan}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('scanNow')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onHtmlUpload}>
                <Code className="h-4 w-4 mr-2" />
                {t('manualHtmlScan')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettings}>
                <Settings className="h-4 w-4 mr-2" />
                {t('scanSettings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('editProject')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                {t('exportReport')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {tc('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t('riskScore')}</span>
            <span className={`text-lg font-bold ${getRiskColor(project.riskScore || 0)}`}>
              {project.riskScore ?? '—'}
              {project.riskScore !== null && <span className="text-sm text-muted-foreground">/100</span>}
            </span>
          </div>
          <Progress value={project.riskScore || 0} className="h-2" aria-label={t('riskScoreAria', { score: project.riskScore ?? 0 })} />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-red-500/10">
            <div className="text-lg font-bold text-red-500">{project.violations?.critical || 0}</div>
            <div className="text-xs text-muted-foreground">{t('crit')}</div>
          </div>
          <div className="p-2 rounded-lg bg-orange-500/10">
            <div className="text-lg font-bold text-orange-500">{project.violations?.serious || 0}</div>
            <div className="text-xs text-muted-foreground">{t('ser')}</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <div className="text-lg font-bold text-yellow-500">{project.violations?.moderate || 0}</div>
            <div className="text-xs text-muted-foreground">{t('mod')}</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <div className="text-lg font-bold text-blue-500">{project.violations?.minor || 0}</div>
            <div className="text-xs text-muted-foreground">{t('min')}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(project.lastScanAt || project.createdAt)}
          </div>
          {project.scans?.[0] && (
            <Badge variant="outline" className={`text-xs ${
              project.scans[0].status === 'completed' ? 'border-emerald-500/20 text-emerald-500' :
              project.scans[0].status === 'running' ? 'border-blue-500/20 text-blue-500' :
              project.scans[0].status === 'failed' ? 'border-red-500/20 text-red-500' : ''
            }`}>
              {project.scans[0].status}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onScan} disabled={isScanning}>
          {isScanning ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('scanning')}</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" />{t('scan')}</>
          )}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onHtmlUpload} title={t('manualTitle')}>
          <Code className="h-4 w-4 mr-2" />
          {t('manual')}
        </Button>
      </CardFooter>
    </Card>
  );
}
