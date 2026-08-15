'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Globe, Clock, Loader2, RefreshCw, Code, MoreHorizontal,
  Settings, Edit, Download, Trash2, CheckCircle2, AlertCircle, Upload
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useCreateProject, useCreateScan, useVerifyProject } from '@/hooks/useApi';
import { getRiskColor, formatRelativeTime } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import type { CreateProjectInput } from '@/types';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: projects, isLoading, refetch: refetchProjects } = useProjects(orgSlug);
  const createProject = useCreateProject();
  const createScan = useCreateScan();
  const router = useRouter();
  const verifyProject = useVerifyProject();
  const [verificationData, setVerificationData] = useState<{
    verificationToken: string;
    instructions: { method: string; html: string; location: string; domain: string };
    alternativeMethods: Array<{ method: string; instruction: string }>;
  } | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; skipped: number; failedDetails: Array<{ url?: string; name?: string; error: string }> } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHtmlUploadOpen, setIsHtmlUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [htmlUploadProject, setHtmlUploadProject] = useState<{ id: string; name: string } | null>(null);
  const [settingsProject, setSettingsProject] = useState<{ id: string; name: string; url: string; isVerified?: boolean; scanConfig?: string } | null>(null);
  const [editingProject, setEditingProject] = useState<CreateProjectInput & { id: string } | null>(null);
  const [deleteProject, setDeleteProject] = useState<{ id: string; name: string } | null>(null);
  const [manualHtml, setManualHtml] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: '',
    url: '',
    description: ''
  });
  const [scanFrequency, setScanFrequency] = useState('none');

  useEffect(() => {
    if (window.location.search.includes('new=1')) {
      setIsAddOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [scanSettings, setScanSettings] = useState<{
    requestDelay: number;
    userAgent: string;
    timeout: number;
    retryCount: number;
  }>({
    requestDelay: 500,
    userAgent: 'default',
    timeout: 30000,
    retryCount: 3
  });

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.url) {
      toast({ title: tc('error'), description: t('nameAndUrlRequired'), variant: 'destructive' });
      return;
    }

    if (!orgSlug) {
      toast({ title: tc('error'), description: t('orgNotFound'), variant: 'destructive' });
      return;
    }

    try {
      const result = await createProject.mutateAsync({ ...newProject, orgSlug });
      toast({
        title: t('projectCreated'),
        description: t('projectCreatedMsg', { name: newProject.name })
      });
      if (scanFrequency && scanFrequency !== 'none' && result?.project?.id) {
        try {
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: result.project.id, schedule: scanFrequency }),
          });
          toast({ title: t('scanScheduled'), description: t('scanScheduledMsg', { frequency: scanFrequency }) });
        } catch {
          toast({ title: tc('error'), description: t('scheduleFailed'), variant: 'destructive' });
        }
      }
      setIsAddOpen(false);
      setNewProject({ name: '', url: '', description: '' });
      setScanFrequency('none');
    } catch (error) {
      toast({ title: tc('error'), description: t('createFailed'), variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!orgSlug) {
      toast({ title: tc('error'), description: t('orgNotFound'), variant: 'destructive' });
      return;
    }

    const rows: Array<{ name: string; url: string; description: string; scanFrequency: string }> = [];
    for (const line of importCsvText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cols = trimmed.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (cols.length < 2) continue;
      rows.push({
        name: cols[0],
        url: cols[1],
        description: cols[2] || '',
        scanFrequency: cols[3] || 'none',
      });
    }

    if (rows.length === 0) {
      toast({ title: tc('error'), description: t('noValidRows'), variant: 'destructive' });
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: rows, orgSlug }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: t('importFailed'), description: data.error || t('importFailed'), variant: 'destructive' });
      } else {
        setImportResult({
          created: data.data.totalCreated,
          failed: data.data.totalFailed,
          skipped: data.data.totalSkipped,
          failedDetails: [...data.data.failed, ...data.data.skipped],
        });
        toast({
          title: t('importComplete'),
          description: t('importCompleteMsg', {
            created: data.data.totalCreated,
            failed: data.data.totalFailed,
            skipped: data.data.totalSkipped,
          }),
        });
        refetchProjects();
      }
    } catch {
      toast({ title: t('importFailed'), description: t('importFailed'), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleScan = async (projectId: string, projectName: string) => {
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({
        title: t('scanCompleted'),
        description: t('scanCompletedMsg', { count: result?.scan?.violationsFound || 0, name: projectName })
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('scanFailedStart');
      toast({ title: t('scanFailed'), description: errorMsg, variant: 'destructive' });
    }
  };

  const handleManualScan = async () => {
    if (!htmlUploadProject || !manualHtml.trim()) {
      toast({ title: tc('error'), description: t('pasteHtml'), variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: htmlUploadProject.id,
          html: manualHtml
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('manualScanCompleted'),
          description: t('manualScanCompletedMsg', { count: result.data?.scan?.violationsFound || 0 })
        });
        setIsHtmlUploadOpen(false);
        setManualHtml('');
        setHtmlUploadProject(null);
      } else {
        toast({ title: t('scanFailed'), description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: tc('error'), description: t('failedSubmitManual'), variant: 'destructive' });
    }
  };

  const openHtmlUpload = (projectId: string, projectName: string) => {
    setHtmlUploadProject({ id: projectId, name: projectName });
    setIsHtmlUploadOpen(true);
  };

  const openSettings = (project: { id: string; name: string; url: string; isVerified?: boolean; scanConfig?: string }) => {    setSettingsProject(project);
    if (project.scanConfig) {
      try {
        const parsed = JSON.parse(project.scanConfig);
        setScanSettings({
          requestDelay: parsed.requestDelay || 500,
          userAgent: parsed.userAgent || 'default',
          timeout: parsed.timeout || 30000,
          retryCount: parsed.retryCount || 3
        });
      } catch {
      }
    }
    setIsSettingsOpen(true);
  };

  const openEdit = (project: { id: string; name: string; url: string; description?: string | null }) => {
    setEditingProject({ id: project.id, name: project.name, url: project.url, description: project.description || '' });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProject?.name || !editingProject?.url) {
      toast({ title: tc('error'), description: t('nameAndUrlRequired'), variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProject.id,
          name: editingProject.name,
          url: editingProject.url,
          description: editingProject.description
        })
      });
      if (response.ok) {
        toast({ title: t('projectUpdated'), description: t('projectUpdatedMsg', { name: editingProject.name }) });
        setIsEditOpen(false);
        setEditingProject(null);
        await refetchProjects();
      } else {
        toast({ title: tc('error'), description: t('updateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('updateFailed'), variant: 'destructive' });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(deleteProject.id)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast({ title: t('projectDeleted'), description: t('projectDeletedMsg', { name: deleteProject.name }) });
        setIsDeleteOpen(false);
        setDeleteProject(null);
        await refetchProjects();
      } else {
        toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVerifyProject = async (projectId: string) => {
    try {
      const result = await verifyProject.generateToken.mutateAsync(projectId);
      setVerificationData(result as typeof verificationData);
      setShowVerificationDialog(true);
    } catch {
      toast({ title: tc('error'), description: t('verifyTokenFailed'), variant: 'destructive' });
    }
  };

  const handleCheckVerification = async (projectId: string) => {
    try {
      const result = await verifyProject.checkStatus.mutateAsync(projectId);
      if (result?.verified) {
        toast({ title: t('verifiedTitle'), description: t('verifiedMsg') });
        if (settingsProject) {
          setSettingsProject({ ...settingsProject, isVerified: true });
        }
        setShowVerificationDialog(false);
      } else {
        toast({ title: t('notVerifiedTitle'), description: result?.message || t('notVerifiedMsg'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('checkVerificationFailed'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                {t('importCsv')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('bulkImportTitle')}</DialogTitle>
                <DialogDescription>
                  {t('bulkImportDesc', { format: 'name,url,description,scanFrequency' })}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="import-csv">{t('csvFile')}</Label>
                  <Input
                    id="import-csv"
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setImportCsvText(String(reader.result || ''));
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="import-paste">{t('pasteRows')}</Label>
                  <Textarea
                    id="import-paste"
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    placeholder={t('csvPlaceholder')}
                    rows={6}
                    autoComplete="off"
                  />
                </div>
                {importResult && (
                  <div className={`p-3 rounded-lg border text-sm ${importResult.failed > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                    <div className="font-medium mb-1">
                      {t('importResult', { created: importResult.created, failed: importResult.failed, skipped: importResult.skipped })}
                    </div>
                    {importResult.failedDetails.slice(0, 5).map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground">- {f.url || f.name || '?'}: {f.error}</p>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={importing}>
                  {tc('close')}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || !importCsvText.trim()}
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('importing')}</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />{t('importProjects')}</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
                <Plus className="h-4 w-4 mr-2" />
                {t('addProject')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('addProjectTitle')}</DialogTitle>
              <DialogDescription>
                {t('addProjectDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('nameRequired')}</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder={t('namePlaceholder')}
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">{t('urlRequired')}</Label>
                <Input
                  id="url"
                  type="url"
                  value={newProject.url}
                  onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                  placeholder={t('urlPlaceholder')}
                  autoComplete="url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder={t('descPlaceholder')}
                  rows={3}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scan-frequency">{t('scanFrequency')}</Label>
                <Select value={scanFrequency} onValueChange={setScanFrequency}>
                  <SelectTrigger id="scan-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noneFrequency')}</SelectItem>
                    <SelectItem value="daily">{t('daily')}</SelectItem>
                    <SelectItem value="weekly">{t('weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                className="bg-coral hover:bg-coral/90 text-coral-foreground"
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creating')}</>
                ) : (
                  t('addProject')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} className="hover:border-coral/30 transition-colors group">
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
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-coral transition-colors"
                      >
                        {(() => { try { return new URL(project.url).hostname } catch { return project.url } })()}
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
                      <DropdownMenuItem onClick={() => handleScan(project.id, project.name)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('scanNow')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openHtmlUpload(project.id, project.name)}>
                        <Code className="h-4 w-4 mr-2" />
                        {t('manualHtmlScan')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openSettings(project)}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('scanSettings')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('editProject')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        {t('exportReport')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDeleteProject({ id: project.id, name: project.name });
                          setIsDeleteOpen(true);
                        }}
                      >
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
                  <Progress
                    value={project.riskScore || 0}
                    className="h-2"
                    aria-label={t('riskScoreAria', { score: project.riskScore ?? 0 })}
                  />
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleScan(project.id, project.name)}
                  disabled={createScan.isPending}
                >
                  {createScan.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('scanning')}</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" />{t('scan')}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openHtmlUpload(project.id, project.name)}
                  title={t('manualTitle')}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {t('manual')}
                </Button>
              </CardFooter>
            </Card>
          ))}

          {(!projects || projects.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-16 text-center">
                <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">{t('noProjectsTitle')}</h3>
                <p className="text-muted-foreground mb-4">{t('noProjectsDesc')}</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addFirstProject')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isHtmlUploadOpen} onOpenChange={setIsHtmlUploadOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('manualScanTitle')}</DialogTitle>
            <DialogDescription>
              {t('manualScanDesc', { name: htmlUploadProject?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="manual-html">{t('htmlSource')}</Label>
              <Textarea
                id="manual-html"
                placeholder="<!DOCTYPE html>&#10;<html>&#10;  <head>...</head>&#10;  <body>...</body>&#10;</html>"
                value={manualHtml}
                onChange={(e) => setManualHtml(e.target.value)}
                className="min-h-64 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('htmlTip')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHtmlUploadOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleManualScan}
              disabled={!manualHtml.trim()}
            >
              {t('scanHtml')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settingsTitle', { name: settingsProject?.name || '' })}</DialogTitle>
            <DialogDescription>
              {t('settingsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {settingsProject && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{t('domainVerification')}</span>
                  <div className="flex items-center gap-2">
                    {settingsProject.isVerified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('verified')}
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {t('unverified')}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyProject(settingsProject.id)}
                          disabled={verifyProject.generateToken.isPending}
                        >
                          {verifyProject.generateToken.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {t('verifyNow')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settingsProject.isVerified
                    ? t('verifiedDesc')
                    : t('unverifiedDesc')}
                </p>
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userAgent">{t('userAgent')}</Label>
                <Select
                  value={scanSettings.userAgent}
                  onValueChange={(v) => setScanSettings({ ...scanSettings, userAgent: v })}
                >
                  <SelectTrigger id="userAgent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('agDefault')}</SelectItem>
                    <SelectItem value="chrome">{t('chrome')}</SelectItem>
                    <SelectItem value="firefox">{t('firefox')}</SelectItem>
                    <SelectItem value="safari">{t('safari')}</SelectItem>
                    <SelectItem value="googlebot">{t('googlebot')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('userAgentHint')}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requestDelay">{t('requestDelay')}</Label>
                <Input
                  id="requestDelay"
                  type="number"
                  value={scanSettings.requestDelay}
                  onChange={(e) => setScanSettings({ ...scanSettings, requestDelay: parseInt(e.target.value) || 500 })}
                  min={0}
                  max={10000}
                />
                <p className="text-xs text-muted-foreground">
                  {t('requestDelayHint')}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="retryCount">{t('retryAttempts')}</Label>
                <Input
                  id="retryCount"
                  type="number"
                  value={scanSettings.retryCount}
                  onChange={(e) => setScanSettings({ ...scanSettings, retryCount: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  {t('retryAttemptsHint')}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-coral/5 border border-coral/20">
              <div className="flex items-start gap-3">
                <Code className="h-5 w-5 text-coral mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{t('cantScanAuto')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('cantScanAutoDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={async () => {
                try {
                  const response = await fetch('/api/projects', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: settingsProject?.id,
                      scanConfig: JSON.stringify(scanSettings)
                    })
                  });
                  if (response.ok) {
                    toast({ title: t('settingsSaved'), description: t('settingsSavedMsg') });
                    setIsSettingsOpen(false);
                  }
                } catch (e) {
                  toast({ title: tc('error'), description: t('settingsSaveFailed'), variant: 'destructive' });
                }
              }}
            >
              {t('saveSettings')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
            <DialogDescription>
              {t('editDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('nameRequired')}</Label>
              <Input
                id="edit-name"
                value={editingProject?.name ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, name: e.target.value } : null)}
                placeholder={t('namePlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">{t('urlRequired')}</Label>
              <Input
                id="edit-url"
                type="url"
                value={editingProject?.url ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, url: e.target.value } : null)}
                placeholder={t('urlPlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('description')}</Label>
              <Textarea
                id="edit-description"
                value={editingProject?.description ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, description: e.target.value } : null)}
                placeholder={t('descPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleSaveEdit}
              disabled={isDeleting}
            >
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDesc', { name: deleteProject?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('deleting')}</> : t('projectDeleted')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-coral" />
              {t('verifyDomainTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('verifyDomainDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {verificationData && (
              <>
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs font-medium mb-2 block">{t('metaTag')}</Label>
                  <code className="block p-3 bg-background rounded border text-sm font-mono break-all">
                    {verificationData.instructions.html}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('addToHead')} <strong>{'<head>'}</strong> {t('headSection', { domain: verificationData.instructions.domain })}
                  </p>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {t('altMethods')}
                  </summary>
                  <div className="mt-2 space-y-2 pl-4">
                    {verificationData.alternativeMethods.map((alt, i) => (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium mb-1 uppercase text-muted-foreground">{alt.method}</p>
                        <code className="text-sm font-mono">{alt.instruction}</code>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
              {tc('close')}
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={() => settingsProject && handleCheckVerification(settingsProject.id)}
              disabled={verifyProject.checkStatus.isPending}
            >
              {verifyProject.checkStatus.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('checking')}</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />{t('verifyNow')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
