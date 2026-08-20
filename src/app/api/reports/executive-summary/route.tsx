import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #10b981',
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    marginLeft: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    color: '#6b7280',
  },
  value: {
    width: '60%',
    fontWeight: 'bold',
  },
  severityCritical: { color: '#ef4444', fontWeight: 'bold' },
  severitySerious: { color: '#f97316', fontWeight: 'bold' },
  severityModerate: { color: '#eab308', fontWeight: 'bold' },
  severityMinor: { color: '#3b82f6', fontWeight: 'bold' },
  card: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  bullet: {
    marginBottom: 4,
    paddingLeft: 8,
  },
});

function ExecutiveSummary({ data }: { data: {
  organization: { name: string };
  project: { name: string; url: string; riskScore: number | null };
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  };
  scans: Array<{ id: string; createdAt: Date; pagesScanned: number; violationsFound: number; status: string }>;
  topRules: Array<{ ruleId: string; count: number }>;
  trends: { direction: string; delta: number };
  logoUrl?: string;
} }) {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColor = (count: number) =>
    count === 0 ? '#22c55e' : count <= 3 ? '#f59e0b' : '#ef4444';

  const riskLabel = (score: number) =>
    score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : score >= 40 ? 'At Risk' : 'Critical';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Executive Summary</Text>
            <Text style={styles.subtitle}>{data.organization.name} • Accessibility Compliance Overview</Text>
          </View>
          {data.logoUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- PDF image (react-pdf) has no alt support
            <Image style={styles.logo} src={data.logoUrl} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.row}><Text style={styles.label}>Project:</Text><Text style={styles.value}>{data.project.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>URL:</Text><Text style={styles.value}>{data.project.url}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Report Date:</Text><Text style={styles.value}>{reportDate}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Scans Analyzed:</Text><Text style={styles.value}>{data.scans.length}</Text></View>
          <View style={styles.row}>
            <Text style={styles.label}>Compliance Trend:</Text>
            <Text style={styles.value}>
              {data.trends.direction === 'improving' ? 'Improving' : data.trends.direction === 'worsening' ? 'Worsening' : 'Stable'}
              {' '}({data.trends.delta > 0 ? '+' : ''}{data.trends.delta} violations vs last scan)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Risk Score</Text>
            <Text style={[styles.cardValue, { color: statusColor(data.summary.total) }]}>
              {data.project.riskScore ?? 0}/100
            </Text>
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
              Status: {riskLabel(data.project.riskScore ?? 0)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open Violations</Text>
            <Text style={[styles.cardValue, { color: statusColor(data.summary.total) }]}>{data.summary.total}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: '25%' }]}>Critical:</Text>
            <Text style={[styles.value, styles.severityCritical]}>{data.summary.critical}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: '25%' }]}>Serious:</Text>
            <Text style={[styles.value, styles.severitySerious]}>{data.summary.serious}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: '25%' }]}>Moderate:</Text>
            <Text style={[styles.value, styles.severityModerate]}>{data.summary.moderate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: '25%' }]}>Minor:</Text>
            <Text style={[styles.value, styles.severityMinor]}>{data.summary.minor}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Common Issues</Text>
          {data.topRules.slice(0, 8).map((rule, i) => (
            <View key={rule.ruleId} style={styles.bullet}>
              <Text>
                {i + 1}. {rule.ruleId} — {rule.count} occurrence{rule.count > 1 ? 's' : ''}
              </Text>
            </View>
          ))}
          {data.topRules.length === 0 && <Text style={{ color: '#6b7280' }}>No violations recorded.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {data.summary.critical > 0 && (
            <View style={styles.bullet}><Text>• Address {data.summary.critical} critical issue(s) immediately — these can block users with disabilities and pose legal risk.</Text></View>
          )}
          {data.summary.serious > 0 && (
            <View style={styles.bullet}><Text>• Fix {data.summary.serious} serious issue(s) within the next sprint to reduce liability.</Text></View>
          )}
          {data.summary.total > 0 ? (
            <>
              <View style={styles.bullet}><Text>• Review the top recurring rules and add automated checks to your CI pipeline.</Text></View>
              <View style={styles.bullet}><Text>• Schedule a manual audit with assistive technologies to complement automated findings.</Text></View>
              <View style={styles.bullet}><Text>• Re-scan after remediation to verify fixes and track compliance improvement.</Text></View>
            </>
          ) : (
            <View style={styles.bullet}><Text>• No open violations. Keep monitoring with scheduled scans to maintain compliance.</Text></View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>
            Generated by AccessGuard • {reportDate}
            {'\n'}
            Executive summary of automated WCAG 2.1 AA accessibility scans.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// GET /api/reports/executive-summary?projectId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const [violations, scans] = await Promise.all([
      db.violation.findMany({
        where: { projectId, status: 'open' },
        select: { severity: true, ruleId: true },
      }),
      db.scan.findMany({
        where: { projectId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          createdAt: true,
          pagesScanned: true,
          violationsFound: true,
          status: true,
        },
      }),
    ]);

    const summary = {
      critical: violations.filter(v => v.severity === 'critical').length,
      serious: violations.filter(v => v.severity === 'serious').length,
      moderate: violations.filter(v => v.severity === 'moderate').length,
      minor: violations.filter(v => v.severity === 'minor').length,
      total: violations.length,
    };

    const ruleCounts = new Map<string, number>();
    for (const v of violations) {
      ruleCounts.set(v.ruleId, (ruleCounts.get(v.ruleId) || 0) + 1);
    }
    const topRules = [...ruleCounts.entries()]
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);

    let trends = { direction: 'stable' as string, delta: 0 };
    if (scans.length >= 2) {
      const latest = scans[0].violationsFound;
      const previous = scans[1].violationsFound;
      const delta = latest - previous;
      trends = {
        direction: delta < 0 ? 'improving' : delta > 0 ? 'worsening' : 'stable',
        delta: Math.abs(delta),
      };
    }

    const orgSettings = project.organization?.settings ? JSON.parse(project.organization.settings) : {};

    const reportData = {
      organization: { name: project.organization.name },
      project: { name: project.name, url: project.url, riskScore: project.riskScore },
      summary,
      scans,
      topRules,
      trends,
      logoUrl: orgSettings.logoUrl,
    };

    const { renderToBuffer } = await import('@react-pdf/renderer');
    const doc = React.createElement(ExecutiveSummary, { data: reportData });
    const buffer = await renderToBuffer(doc as React.ReactElement<any>);

    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'executive_summary_generated',
        metadata: JSON.stringify({ projectId: project.id }),
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="executive-summary-${project.id}.pdf"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to generate executive summary' },
      { status: 500 }
    );
  }
}
