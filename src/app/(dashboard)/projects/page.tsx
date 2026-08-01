'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Globe, Clock, Loader2, RefreshCw, Code, MoreHorizontal,
  Settings, Edit, Download, Trash2, CheckCircle2, AlertCircle, Upload
} from 'lucide-react';
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
      toast({ title: 'Error', description: 'Name and URL are required', variant: 'destructive' });
      return;
    }

    if (!orgSlug) {
      toast({ title: 'Error', description: 'Organization not found. Please log in again.', variant: 'destructive' });
      return;
    }

    try {
      const result = await createProject.mutateAsync({ ...newProject, orgSlug });
      toast({
        title: 'Project Created',
        description: `"${newProject.name}" has been added and scanning has started.`
      });
      if (scanFrequency && scanFrequency !== 'none' && result?.project?.id) {
        try {
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: result.project.id, schedule: scanFrequency }),
          });
          toast({ title: 'Scan Scheduled', description: `Automatic ${scanFrequency} scans enabled.` });
        } catch {
          toast({ title: 'Warning', description: 'Project created but scheduling failed', variant: 'destructive' });
        }
      }
      setIsAddOpen(false);
      setNewProject({ name: '', url: '', description: '' });
      setScanFrequency('none');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (!orgSlug) {
      toast({ title: 'Error', description: 'Organization not found. Please log in again.', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'No valid rows found in CSV', variant: 'destructive' });
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
        toast({ title: 'Import Failed', description: data.error || 'Failed to import projects', variant: 'destructive' });
      } else {
        setImportResult({
          created: data.data.totalCreated,
          failed: data.data.totalFailed,
          skipped: data.data.totalSkipped,
          failedDetails: [...data.data.failed, ...data.data.skipped],
        });
        toast({
          title: 'Import Complete',
          description: `${data.data.totalCreated} project(s) imported, ${data.data.totalFailed} failed, ${data.data.totalSkipped} skipped`,
        });
        refetchProjects();
      }
    } catch {
      toast({ title: 'Import Failed', description: 'Failed to import projects', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleScan = async (projectId: string, projectName: string) => {
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({
        title: 'Scan Completed',
        description: `Found ${result?.scan?.violationsFound || 0} violations on "${projectName}".`
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start scan';
      toast({ title: 'Scan Failed', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleManualScan = async () => {
    if (!htmlUploadProject || !manualHtml.trim()) {
      toast({ title: 'Error', description: 'Please paste HTML content to scan', variant: 'destructive' });
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
          title: 'Manual Scan Completed',
          description: `Found ${result.data?.scan?.violationsFound || 0} violations.`
        });
        setIsHtmlUploadOpen(false);
        setManualHtml('');
        setHtmlUploadProject(null);
      } else {
        toast({ title: 'Scan Failed', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit manual scan', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Name and URL are required', variant: 'destructive' });
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
        toast({ title: 'Project Updated', description: `"${editingProject.name}" has been updated.` });
        setIsEditOpen(false);
        setEditingProject(null);
        await refetchProjects();
      } else {
        toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update project', variant: 'destructive' });
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
        toast({ title: 'Project Deleted', description: `"${deleteProject.name}" has been deleted.` });
        setIsDeleteOpen(false);
        setDeleteProject(null);
        await refetchProjects();
      } else {
        toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Failed to generate verification token', variant: 'destructive' });
    }
  };

  const handleCheckVerification = async (projectId: string) => {
    try {
      const result = await verifyProject.checkStatus.mutateAsync(projectId);
      if (result?.verified) {
        toast({ title: 'Verified!', description: 'Domain verification successful' });
        if (settingsProject) {
          setSettingsProject({ ...settingsProject, isVerified: true });
        }
        setShowVerificationDialog(false);
      } else {
        toast({ title: 'Not Verified', description: result?.message || 'Verification token not found on website', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to check verification status', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your monitored websites</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bulk Import Projects</DialogTitle>
                <DialogDescription>
                  Upload a CSV file or paste rows. Format: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">name,url,description,scanFrequency</code> — one project per row. scanFrequency is optional (none|daily|weekly|monthly).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="import-csv">CSV File</Label>
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
                  <Label htmlFor="import-paste">Or paste rows directly</Label>
                  <Textarea
                    id="import-paste"
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    placeholder={"Acme Site,https://acme.com,Main marketing site,daily\nDocs,https://docs.acme.com,Documentation portal,weekly"}
                    rows={6}
                    autoComplete="off"
                  />
                </div>
                {importResult && (
                  <div className={`p-3 rounded-lg border text-sm ${importResult.failed > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                    <div className="font-medium mb-1">
                      {importResult.created} imported, {importResult.failed} failed, {importResult.skipped} skipped
                    </div>
                    {importResult.failedDetails.slice(0, 5).map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground">- {f.url || f.name || '?'}: {f.error}</p>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={importing}>
                  Close
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || !importCsvText.trim()}
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Import Projects</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-coral hover:bg-coral/90 text-coral-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
              <DialogDescription>
                Enter the URL of the website you want to monitor for accessibility compliance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Website"
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={newProject.url}
                  onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                  placeholder="https://example.com"
                  autoComplete="url"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of the project"
                  rows={3}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scan-frequency">Scan Frequency</Label>
                <Select value={scanFrequency} onValueChange={setScanFrequency}>
                  <SelectTrigger id="scan-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No automatic scans</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-coral hover:bg-coral/90 text-coral-foreground"
                onClick={handleCreateProject}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  'Create & Scan'
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
                          High Risk
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
                        Next scan: {new Date(project.nextScheduledScan).toLocaleDateString()} {new Date(project.nextScheduledScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Actions for ${project.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleScan(project.id, project.name)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Scan Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openHtmlUpload(project.id, project.name)}>
                        <Code className="h-4 w-4 mr-2" />
                        Manual HTML Scan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openSettings(project)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Scan Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
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
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className={`text-lg font-bold ${getRiskColor(project.riskScore || 0)}`}>
                      {project.riskScore ?? '—'}
                      {project.riskScore !== null && <span className="text-sm text-muted-foreground">/100</span>}
                    </span>
                  </div>
                  <Progress
                    value={project.riskScore || 0}
                    className="h-2"
                    aria-label={`Risk score: ${project.riskScore ?? 0} out of 100`}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <div className="text-lg font-bold text-red-500">{project.violations?.critical || 0}</div>
                    <div className="text-xs text-muted-foreground">Crit</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <div className="text-lg font-bold text-orange-500">{project.violations?.serious || 0}</div>
                    <div className="text-xs text-muted-foreground">Ser</div>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <div className="text-lg font-bold text-yellow-500">{project.violations?.moderate || 0}</div>
                    <div className="text-xs text-muted-foreground">Mod</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <div className="text-lg font-bold text-blue-500">{project.violations?.minor || 0}</div>
                    <div className="text-xs text-muted-foreground">Min</div>
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
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scanning...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-2" />Scan</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openHtmlUpload(project.id, project.name)}
                  title="Paste HTML for manual scan (useful for protected sites)"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Manual
                </Button>
              </CardFooter>
            </Card>
          ))}

          {(!projects || projects.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-16 text-center">
                <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">Add your first website to start monitoring for accessibility issues.</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={isHtmlUploadOpen} onOpenChange={setIsHtmlUploadOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual HTML Scan</DialogTitle>
            <DialogDescription>
              Paste the HTML source code of "{htmlUploadProject?.name}" to scan for accessibility issues.
              This is useful when the website has bot protection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="manual-html">HTML Source Code</Label>
              <Textarea
                id="manual-html"
                placeholder="<!DOCTYPE html>&#10;<html>&#10;  <head>...</head>&#10;  <body>...</body>&#10;</html>"
                value={manualHtml}
                onChange={(e) => setManualHtml(e.target.value)}
                className="min-h-64 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Right-click on the webpage, select "View Page Source", copy all, and paste here.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHtmlUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleManualScan}
              disabled={!manualHtml.trim()}
            >
              Scan HTML
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Settings - {settingsProject?.name}</DialogTitle>
            <DialogDescription>
              Configure scan options to handle bot protection and rate limiting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {settingsProject && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Domain Verification</span>
                  <div className="flex items-center gap-2">
                    {settingsProject.isVerified ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Verified
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
                          Verify Now
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settingsProject.isVerified
                    ? 'Your domain is verified. Scans will use enhanced access mode.'
                    : 'Verify your domain to bypass some bot protection measures.'}
                </p>
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userAgent">User-Agent</Label>
                <Select
                  value={scanSettings.userAgent}
                  onValueChange={(v) => setScanSettings({ ...scanSettings, userAgent: v })}
                >
                  <SelectTrigger id="userAgent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">AccessGuard Scanner (Default)</SelectItem>
                    <SelectItem value="chrome">Chrome Browser</SelectItem>
                    <SelectItem value="firefox">Firefox Browser</SelectItem>
                    <SelectItem value="safari">Safari Browser</SelectItem>
                    <SelectItem value="googlebot">Googlebot (for verified sites)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Some sites block specific user agents. Try Chrome or Firefox if scans are blocked.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requestDelay">Request Delay (ms)</Label>
                <Input
                  id="requestDelay"
                  type="number"
                  value={scanSettings.requestDelay}
                  onChange={(e) => setScanSettings({ ...scanSettings, requestDelay: parseInt(e.target.value) || 500 })}
                  min={0}
                  max={10000}
                />
                <p className="text-xs text-muted-foreground">
                  Delay between requests to avoid rate limiting. Increase if getting 429 errors.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="retryCount">Retry Attempts</Label>
                <Input
                  id="retryCount"
                  type="number"
                  value={scanSettings.retryCount}
                  onChange={(e) => setScanSettings({ ...scanSettings, retryCount: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                />
                <p className="text-xs text-muted-foreground">
                  Number of retry attempts if the scan fails.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-coral/5 border border-coral/20">
              <div className="flex items-start gap-3">
                <Code className="h-5 w-5 text-coral mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Can&apos;t scan automatically?</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    If your site has strict bot protection, use Manual HTML Upload instead.
                    Right-click on your webpage, select &quot;View Page Source&quot;, copy all, and paste in the manual scan dialog.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
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
                    toast({ title: 'Settings Saved', description: 'Scan settings have been updated.' });
                    setIsSettingsOpen(false);
                  }
                } catch (e) {
                  toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
                }
              }}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the details of this project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Project Name *</Label>
              <Input
                id="edit-name"
                value={editingProject?.name ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, name: e.target.value } : null)}
                placeholder="My Website"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">Website URL *</Label>
              <Input
                id="edit-url"
                type="url"
                value={editingProject?.url ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, url: e.target.value } : null)}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingProject?.description ?? ''}
                onChange={(e) => setEditingProject(editingProject ? { ...editingProject, description: e.target.value } : null)}
                placeholder="Brief description of the project"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleSaveEdit}
              disabled={isDeleting}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteProject?.name}&quot;? This will stop monitoring and
              remove it from your project list. Existing scan history is archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-coral" />
              Verify Domain Ownership
            </DialogTitle>
            <DialogDescription>
              Add the following meta tag to your website&apos;s homepage to prove you own it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {verificationData && (
              <>
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs font-medium mb-2 block">Meta Tag</Label>
                  <code className="block p-3 bg-background rounded border text-sm font-mono break-all">
                    {verificationData.instructions.html}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add this to the <strong>{'<head>'}</strong> section of your homepage ({verificationData.instructions.domain})
                  </p>
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Alternative verification methods
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
              Close
            </Button>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={() => settingsProject && handleCheckVerification(settingsProject.id)}
              disabled={verifyProject.checkStatus.isPending}
            >
              {verifyProject.checkStatus.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Verify Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
