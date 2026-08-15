import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Shield, Globe, AlertTriangle, CheckCircle2, XCircle, EyeOff, Sparkles, Clock, Link2Off } from 'lucide-react';

interface SharedSummary {
  projectName: string;
  projectUrl: string;
  orgName: string;
  generatedAt: string;
  severity: { critical: number; serious: number; moderate: number; minor: number; total: number };
  status: { open: number; fixed: number; ignored: number };
  totalViolations: number;
  aiFixRate: number;
  lastScanAt: string | null;
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations('sharedReport');

  const reports = await db.complianceReport.findMany({ take: 100 });
  const report = reports.find((r) => {
    try {
      const meta = JSON.parse(r.metadata || '{}');
      return meta.shareToken === token;
    } catch {
      return false;
    }
  });

  if (!report) {
    notFound();
  }

  // Enforce share-link expiry (PRD UC7: shareable links expire)
  let metadata: Record<string, unknown> = {};
  try {
    metadata = report.metadata ? JSON.parse(report.metadata) : {};
  } catch {
    metadata = {};
  }

  const expiresAt = typeof metadata.expiresAt === 'string' ? new Date(metadata.expiresAt) : null;
  const isExpired = expiresAt !== null && expiresAt.getTime() < Date.now();

  let summary: SharedSummary | null = null;
  try {
    summary = report.summary ? (JSON.parse(report.summary) as SharedSummary) : null;
  } catch {
    summary = null;
  }

  // White-label (PRD UC7 / Agency tier): when the org sets a logo, brand the
  // report with the agency logo + org name instead of AccessGuard defaults.
  const project = report.projectId
    ? await db.project.findUnique({ where: { id: report.projectId }, include: { organization: true } })
    : null;
  let orgLogoUrl: string | null = null;
  let orgBrandName = summary?.orgName || project?.organization.name || null;
  if (project) {
    try {
      const settings = JSON.parse(project.organization.settings || '{}') as { logoUrl?: string };
      orgLogoUrl = settings.logoUrl || null;
    } catch {
      orgLogoUrl = null;
    }
  }
  const whiteLabel = Boolean(orgLogoUrl);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-3">
            <Shield className="h-7 w-7 text-coral" />
            <div>
              <h1 className="text-lg font-bold leading-tight">{t('title')}</h1>
              <p className="text-xs text-muted-foreground">{t('shareLinkLabel')}</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-16 text-center space-y-4">
          <Link2Off className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">{t('expiredTitle')}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {summary?.orgName ? `${summary.orgName} ` : ''}
            {t('expiredDesc')}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-3">
          {whiteLabel ? (
            <img src={orgLogoUrl!} alt={t('logoAlt', { org: orgBrandName || t('organization') })} className="h-8 w-auto object-contain" />
          ) : (
            <Shield className="h-7 w-7 text-coral" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">
              {whiteLabel ? t('orgTitle', { org: orgBrandName || t('organization') }) : t('title')}
            </h1>
            <p className="text-xs text-muted-foreground">{t('generatedBy', { org: summary?.orgName || orgBrandName || 'AccessGuard' })}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {expiresAt && (
              <span className="flex items-center gap-1" title={t('shareExpiry')}>
                <Clock className="h-3.5 w-3.5" />
                {t('validUntil', { date: expiresAt.toLocaleDateString() })}
              </span>
            )}
            {summary?.generatedAt ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(summary.generatedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={summary?.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-coral hover:underline"
            >
              {summary?.projectUrl}
            </a>
          </div>
          <h2 className="text-2xl font-bold">{summary?.projectName || t('project')}</h2>
        </div>

        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-3xl font-bold">{summary.totalViolations}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('totalViolations')}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-3xl font-bold">{summary.severity.critical}</p>
                <p className="text-xs text-red-500 mt-1">{t('critical')}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-3xl font-bold">{summary.status.fixed}</p>
                <p className="text-xs text-emerald-500 mt-1">{t('fixed')}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="text-3xl font-bold">{summary.aiFixRate}%</p>
                <p className="text-xs text-coral mt-1">{t('aiFixRate')}</p>
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="font-semibold">{t('openViolationsBySeverity')}</h3>
              <div className="space-y-2">
                {[
                  { label: t('critical'), value: summary.severity.critical, color: 'bg-red-500' },
                  { label: t('serious'), value: summary.severity.serious, color: 'bg-orange-500' },
                  { label: t('moderate'), value: summary.severity.moderate, color: 'bg-yellow-500' },
                  { label: t('minor'), value: summary.severity.minor, color: 'bg-blue-500' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-muted-foreground">{row.label}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${summary.severity.total > 0 ? (row.value / summary.severity.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-5 rounded-xl border border-border bg-card space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-coral" />
                {t('remediationStatus')}
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">{summary.status.fixed}</p>
                  <p className="text-xs text-muted-foreground">{t('fixed')}</p>
                </div>
                <div>
                  <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">{summary.status.open}</p>
                  <p className="text-xs text-muted-foreground">{t('open')}</p>
                </div>
                <div>
                  <EyeOff className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold">{summary.status.ignored}</p>
                  <p className="text-xs text-muted-foreground">{t('ignored')}</p>
                </div>
              </div>
            </section>

            {summary.lastScanAt && (
              <p className="text-xs text-muted-foreground">
                {t('lastScan', { date: new Date(summary.lastScanAt).toLocaleString() })}
              </p>
            )}
          </>
        )}

        <footer className="pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            {whiteLabel
              ? t('footerOrg', { org: orgBrandName || t('organization') })
              : t('footerDefault')}
          </p>
        </footer>
      </main>
    </div>
  );
}
