import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireProjectAccess } from '@/lib/rbac';

// Register fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
  ],
});

// PDF Styles
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
    fontSize: 24,
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
  severityCritical: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  severitySerious: {
    color: '#f97316',
    fontWeight: 'bold',
  },
  severityModerate: {
    color: '#eab308',
    fontWeight: 'bold',
  },
  severityMinor: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  violationItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#fefce8',
    borderLeft: '3px solid #eab308',
  },
  violationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  violationDetails: {
    fontSize: 9,
    color: '#4b5563',
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
  badge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
});

// Create PDF Document Component
function ComplianceReport({ data }: { data: {
  organization: { name: string };
  project: { name: string; url: string };
  scan: { id: string; createdAt: Date; pagesScanned: number };
  violations: Array<{
    ruleId: string;
    severity: string;
    description: string;
    wcagCriteria: string | null;
    status: string;
  }>;
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    total: number;
  };
  riskScore: number;
  logoUrl?: string;
}}) {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return styles.severityCritical;
      case 'serious': return styles.severitySerious;
      case 'moderate': return styles.severityModerate;
      default: return styles.severityMinor;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>WCAG 2.1 AA Compliance Report</Text>
            <Text style={styles.subtitle}>Legal Shield™ Audit Documentation</Text>
          </View>
          {data.logoUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- PDF image (react-pdf) has no alt support
            <Image style={styles.logo} src={data.logoUrl} />
          )}
        </View>

        {/* Report Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Organization:</Text>
            <Text style={styles.value}>{data.organization.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Project:</Text>
            <Text style={styles.value}>{data.project.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>URL Scanned:</Text>
            <Text style={styles.value}>{data.project.url}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Report Date:</Text>
            <Text style={styles.value}>{reportDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pages Scanned:</Text>
            <Text style={styles.value}>{data.scan.pagesScanned}</Text>
          </View>
        </View>

        {/* Compliance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Risk Score:</Text>
            <Text style={data.riskScore >= 80 ? styles.severityMinor : 
                        data.riskScore >= 60 ? styles.severityModerate : 
                        styles.severityCritical}>
              {data.riskScore}/100
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Violations:</Text>
            <Text style={styles.value}>{data.summary.total}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Critical:</Text>
            <Text style={getSeverityStyle('critical')}>{data.summary.critical}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Serious:</Text>
            <Text style={getSeverityStyle('serious')}>{data.summary.serious}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Moderate:</Text>
            <Text style={getSeverityStyle('moderate')}>{data.summary.moderate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Minor:</Text>
            <Text style={getSeverityStyle('minor')}>{data.summary.minor}</Text>
          </View>
        </View>

        {/* Violations Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Violations Found</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={{ width: '15%' }}>Severity</Text>
            <Text style={{ width: '25%' }}>Rule</Text>
            <Text style={{ width: '45%' }}>Description</Text>
            <Text style={{ width: '15%' }}>WCAG</Text>
          </View>

          {/* Table Rows */}
          {data.violations.slice(0, 20).map((violation: { ruleId: string; severity: string; description: string; wcagCriteria: string | null }) => (
            <View key={`${violation.ruleId}-${violation.description.substring(0, 30)}`} style={{ flexDirection: 'row' }}>
              <Text style={[styles.tableCell, { width: '15%' }, getSeverityStyle(violation.severity)]}>
                {violation.severity.toUpperCase()}
              </Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{violation.ruleId}</Text>
              <Text style={[styles.tableCell, { width: '45%', fontSize: 8 }]}>
                {violation.description.substring(0, 80)}...
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{violation.wcagCriteria || '-'}</Text>
            </View>
          ))}

          {data.violations.length > 20 && (
            <Text style={{ padding: 8, fontStyle: 'italic', color: '#6b7280' }}>
              ...and {data.violations.length - 20} more violations
            </Text>
          )}
        </View>

        {/* Legal Notice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Notice</Text>
          <Text style={{ fontSize: 8, color: '#4b5563', lineHeight: 1.5 }}>
            This report documents accessibility compliance efforts as of the report date. 
            This audit was performed using automated WCAG 2.1 AA testing tools. 
            While automated testing can identify many accessibility issues, manual testing 
            with assistive technologies is recommended for comprehensive compliance.
            {'\n\n'}
            This document may be used as evidence of good-faith compliance efforts 
            under the Americans with Disabilities Act (ADA) and similar accessibility legislation.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated by AccessGuard • {reportDate} • Report ID: {data.scan.id}
            {'\n'}
            This document is timestamped and cryptographically signed for legal validity.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// GET - Generate PDF report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');
    const projectId = searchParams.get('projectId');

    if (!scanId && !projectId) {
      return NextResponse.json(
        { success: false, error: 'Scan ID or Project ID is required' },
        { status: 400 }
      );
    }

    let scan;
    let project;

    if (scanId) {
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;

      scan = await db.scan.findFirst({
        where: { id: scanId, project: { orgId: auth.user.orgId } },
        include: {
          project: {
            include: {
              organization: true,
            },
          },
          violations: true,
        },
      });

      if (!scan) {
        return NextResponse.json(
          { success: false, error: 'Scan not found' },
          { status: 404 }
        );
      }

      project = scan.project;
    } else {
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;

      project = await db.project.findUnique({
        where: { id: projectId! },
        include: {
          organization: true,
        },
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }

      scan = await db.scan.findFirst({
        where: { projectId: projectId! },
        include: { violations: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!scan) {
        return NextResponse.json(
          { success: false, error: 'No scans found for this project' },
          { status: 404 }
        );
      }
    }

    // Calculate summary
    const violations = scan.violations;
    const summary = {
      critical: violations.filter(v => v.severity === 'critical').length,
      serious: violations.filter(v => v.severity === 'serious').length,
      moderate: violations.filter(v => v.severity === 'moderate').length,
      minor: violations.filter(v => v.severity === 'minor').length,
      total: violations.length,
    };

    // Get org settings for logo
    const orgSettings = project.organization?.settings ? JSON.parse(project.organization.settings) : {};

    // Prepare report data
    const reportData = {
      organization: project.organization,
      project: { name: project.name, url: project.url },
      logoUrl: orgSettings.logoUrl,
      scan: {
        id: scan.id,
        createdAt: scan.createdAt,
        pagesScanned: scan.pagesScanned,
      },
      violations: violations.map(v => ({
        ruleId: v.ruleId,
        severity: v.severity,
        description: v.description,
        wcagCriteria: v.wcagCriteria,
        status: v.status,
      })),
      summary,
      riskScore: project.riskScore || 0,
    };

    // Generate PDF
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const doc = React.createElement(ComplianceReport, { data: reportData });
    const buffer = await renderToBuffer(doc as React.ReactElement<any>);

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'report_generated',
        metadata: JSON.stringify({
          scanId: scan.id,
          projectId: project.id,
          violationCount: violations.length,
        }),
      },
    });

    // Return PDF
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="accessibility-report-${scan.id}.pdf"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
