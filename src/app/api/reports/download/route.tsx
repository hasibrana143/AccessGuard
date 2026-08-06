import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/reports/download?id=<reportId> - Download a compliance report as PDF.
// Fixes the previously broken `downloadUrl` returned by POST /api/reports/generate
// (PRD UC7: "Generate compliance report (MD + PDF) ... shareable link").
// The PDF includes the report's evidentiary document hash for compliance/legal use.

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#111827', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 12 },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  logo: { width: 96, height: 32, objectFit: 'contain' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#0f766e', marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 140, color: '#6b7280' },
  value: { flex: 1, fontWeight: 600 },
  card: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cardBox: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, padding: 8, alignItems: 'center' },
  cardValue: { fontSize: 16, fontWeight: 700 },
  cardLabel: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  hash: { marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', fontSize: 8, color: '#6b7280' },
});

function ReportPdf({ data }: { data: {
  orgName: string;
  projectName: string;
  projectUrl: string;
  reportId: string;
  documentHash: string;
  generatedAt: string;
  totals: { critical: number; serious: number; moderate: number; minor: number; total: number };
  openTotal: number;
  fixedTotal: number;
  ignoredTotal: number;
  riskScore: number;
  aiFixRate: number;
  lastScanAt: string | null;
  logoUrl?: string;
} }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Compliance Report</Text>
            <Text style={styles.subtitle}>{data.orgName} • Automated WCAG scan evidence</Text>
          </View>
          {data.logoUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt support
            <Image style={styles.logo} src={data.logoUrl} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report</Text>
          <View style={styles.row}><Text style={styles.label}>Report ID</Text><Text style={styles.value}>{data.reportId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Generated</Text><Text style={styles.value}>{data.generatedAt}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Project</Text><Text style={styles.value}>{data.projectName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>URL</Text><Text style={styles.value}>{data.projectUrl}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.card}>
            <View style={styles.cardBox}><Text style={styles.cardValue}>{data.totals.total}</Text><Text style={styles.cardLabel}>Total violations</Text></View>
            <View style={styles.cardBox}><Text style={styles.cardValue}>{data.totals.critical}</Text><Text style={styles.cardLabel}>Critical</Text></View>
            <View style={styles.cardBox}><Text style={styles.cardValue}>{data.openTotal}</Text><Text style={styles.cardLabel}>Open</Text></View>
            <View style={styles.cardBox}><Text style={styles.cardValue}>{data.riskScore}/100</Text><Text style={styles.cardLabel}>Risk score</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Violations by Severity</Text>
          <View style={styles.row}><Text style={styles.label}>Critical</Text><Text style={styles.value}>{data.totals.critical}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Serious</Text><Text style={styles.value}>{data.totals.serious}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Moderate</Text><Text style={styles.value}>{data.totals.moderate}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Minor</Text><Text style={styles.value}>{data.totals.minor}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remediation Status</Text>
          <View style={styles.row}><Text style={styles.label}>Open</Text><Text style={styles.value}>{data.openTotal}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Fixed</Text><Text style={styles.value}>{data.fixedTotal}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Ignored</Text><Text style={styles.value}>{data.ignoredTotal}</Text></View>
          <View style={styles.row}><Text style={styles.label}>AI fix coverage</Text><Text style={styles.value}>{data.aiFixRate}%</Text></View>
        </View>

        <View style={styles.hash}>
          <Text>Evidentiary document hash: {data.documentHash || 'N/A'}</Text>
          <Text>Last completed scan: {data.lastScanAt || 'N/A'}</Text>
          <Text>Generated by AccessGuard — automated WCAG 2.1/2.2 AA detection; not a substitute for a manual audit.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Report ID is required' }, { status: 400 });
    }

    const report = await db.complianceReport.findUnique({
      where: { id },
      include: { project: { include: { organization: true } } },
    });
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(request, report.projectId, { permission: PERMISSIONS.GENERATE_REPORTS });
    if (access instanceof NextResponse) return access;

    const project = report.project;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = report.metadata ? JSON.parse(report.metadata) : {};
    } catch {
      metadata = {};
    }

    let orgLogoUrl: string | undefined;
    try {
      const settings = JSON.parse(project.organization.settings || '{}') as { logoUrl?: string };
      orgLogoUrl = settings.logoUrl || undefined;
    } catch {
      orgLogoUrl = undefined;
    }

    const severityStats = await db.violation.groupBy({
      by: ['severity'],
      where: { projectId: project.id, status: 'open' },
      _count: true,
    });
    const statusStats = await db.violation.groupBy({
      by: ['status'],
      where: { projectId: project.id },
      _count: true,
    });
    const withFix = await db.violation.count({ where: { projectId: project.id, remediationCode: { not: null } } });
    const totalViolations = statusStats.reduce((acc, s) => acc + s._count, 0);
    const lastScan = await db.scan.findFirst({
      where: { projectId: project.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const data = {
      orgName: project.organization.name,
      projectName: project.name,
      projectUrl: project.url,
      reportId: String(metadata.reportId || report.id),
      documentHash: String(metadata.documentHash || 'N/A'),
      generatedAt: new Date(report.generatedAt ?? report.createdAt).toISOString(),
      totals: {
        critical: severityStats.find((s) => s.severity === 'critical')?._count || 0,
        serious: severityStats.find((s) => s.severity === 'serious')?._count || 0,
        moderate: severityStats.find((s) => s.severity === 'moderate')?._count || 0,
        minor: severityStats.find((s) => s.severity === 'minor')?._count || 0,
        total: severityStats.reduce((acc, s) => acc + s._count, 0),
      },
      openTotal: statusStats.find((s) => s.status === 'open')?._count || 0,
      fixedTotal: statusStats.find((s) => s.status === 'fixed')?._count || 0,
      ignoredTotal: statusStats.find((s) => s.status === 'ignored')?._count || 0,
      riskScore: project.riskScore ?? 0,
      aiFixRate: totalViolations > 0 ? Math.round((withFix / totalViolations) * 100) : 0,
      lastScanAt: lastScan?.createdAt.toISOString() || null,
      logoUrl: orgLogoUrl,
    };

    const { renderToBuffer } = await import('@react-pdf/renderer');
    const buffer = await renderToBuffer(React.createElement(ReportPdf, { data }) as never);
    const filename = `accessguard-${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Report download failed');
    return NextResponse.json({ success: false, error: 'Failed to generate PDF' }, { status: 500 });
  }
}
