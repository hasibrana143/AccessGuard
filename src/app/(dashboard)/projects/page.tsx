'use client';

import { useState, useEffect } from 'react';
import { Plus, Upload, Globe, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, useCreateScan, useVerifyProject } from '@/hooks/useApi';
import { useRouter } from 'next/navigation';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ImportProjectsDialog } from '@/components/projects/import-projects-dialog';
import { EditProjectDialog } from '@/components/projects/edit-project-dialog';
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';
import { ProjectSettingsDialog } from '@/components/projects/project-settings-dialog';
import { HtmlUploadDialog } from '@/components/projects/html-upload-dialog';
import { VerifyDomainDialog } from '@/components/projects/verify-domain-dialog';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: projects, isLoading, refetch: refetchProjects } = useProjects(orgSlug);
  const createScan = useCreateScan();
  const router = useRouter();
  const verifyProject = useVerifyProject();

  // Dialog open states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHtmlUploadOpen, setIsHtmlUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  // Selected project states
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; url: string; description?: string | null } | null>(null);
  const [deleteProject, setDeleteProject] = useState<{ id: string; name: string } | null>(null);
  const [htmlUploadProject, setHtmlUploadProject] = useState<{ id: string; name: string } | null>(null);
  const [settingsProject, setSettingsProject] = useState<{ id: string; name: string; url: string; isVerified?: boolean; scanConfig?: string } | null>(null);
  const [verificationData, setVerificationData] = useState<{
    verificationToken: string;
    instructions: { method: string; html: string; location: string; domain: string };
    alternativeMethods: Array<{ method: string; instruction: string }>;
  } | null>(null);

  useEffect(() => {
    if (window.location.search.includes('new=1')) {
      setIsAddOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleScan = async (projectId: string, projectName: string) => {
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({ title: t('scanCompleted'), description: t('scanCompletedMsg', { count: result?.scan?.violationsFound || 0, name: projectName }) });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('scanFailedStart');
      toast({ title: t('scanFailed'), description: errorMsg, variant: 'destructive' });
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
        if (settingsProject) setSettingsProject({ ...settingsProject, isVerified: true });
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
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />{t('importCsv')}
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />{t('addProject')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isScanning={createScan.isPending}
              onScan={() => handleScan(project.id, project.name)}
              onHtmlUpload={() => { setHtmlUploadProject({ id: project.id, name: project.name }); setIsHtmlUploadOpen(true); }}
              onSettings={() => setSettingsProject(project)}
              onEdit={() => { setEditingProject(project); setIsEditOpen(true); }}
              onDelete={() => { setDeleteProject({ id: project.id, name: project.name }); setIsDeleteOpen(true); }}
            />
          ))}
          {(!projects || projects.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-16 text-center">
                <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">{t('noProjectsTitle')}</h3>
                <p className="text-muted-foreground mb-4">{t('noProjectsDesc')}</p>
                <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />{t('addFirstProject')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <CreateProjectDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      <ImportProjectsDialog open={isImportOpen} onOpenChange={setIsImportOpen} onImported={refetchProjects} />
      <EditProjectDialog open={isEditOpen} onOpenChange={setIsEditOpen} project={editingProject} onSaved={refetchProjects} />
      <DeleteProjectDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} project={deleteProject} onDeleted={refetchProjects} />
      <ProjectSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} project={settingsProject} />
      <HtmlUploadDialog open={isHtmlUploadOpen} onOpenChange={setIsHtmlUploadOpen} project={htmlUploadProject} />
      <VerifyDomainDialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog} verificationData={verificationData} isChecking={verifyProject.checkStatus.isPending} onCheck={() => settingsProject && handleCheckVerification(settingsProject.id)} />
    </div>
  );
}
