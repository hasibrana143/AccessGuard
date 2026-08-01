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
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 9 },
  header: { marginBottom: 20, borderBottom: '2px solid #2563eb', paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 3 },
  logo: { width: 50, height: 50, objectFit: 'contain', marginLeft: 10 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, backgroundColor: '#dbeafe', padding: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 6 },
  tableHeaderCell: { color: 'white', fontWeight: 'bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e5e7eb', padding: 5 },
  tableRowAlt: { flexDirection: 'row', borderBottom: '1px solid #e5e7eb', padding: 5, backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 8 },
  supports: { color: '#16a34a', fontWeight: 'bold' },
  partial: { color: '#ca8a04', fontWeight: 'bold' },
  notSupport: { color: '#dc2626', fontWeight: 'bold' },
  na: { color: '#6b7280' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1px solid #e5e7eb', paddingTop: 10, fontSize: 7, color: '#9ca3af', textAlign: 'center' },
  summaryBox: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  summaryItem: { alignItems: 'center', padding: 8, backgroundColor: '#f3f4f6', borderRadius: 4, width: '22%' },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { fontSize: 8, color: '#6b7280', marginTop: 2 },
});

const WCAG_CRITERIA: Array<{ id: string; level: string; name: string }> = [
  { id: '1.1.1', level: 'A', name: 'Non-text Content' },
  { id: '1.2.1', level: 'A', name: 'Audio-only and Video-only (Prerecorded)' },
  { id: '1.2.2', level: 'A', name: 'Captions (Prerecorded)' },
  { id: '1.2.3', level: 'A', name: 'Audio Description or Media Alternative (Prerecorded)' },
  { id: '1.2.4', level: 'AA', name: 'Captions (Live)' },
  { id: '1.2.5', level: 'AA', name: 'Audio Description (Prerecorded)' },
  { id: '1.3.1', level: 'A', name: 'Info and Relationships' },
  { id: '1.3.2', level: 'A', name: 'Meaningful Sequence' },
  { id: '1.3.3', level: 'A', name: 'Sensory Characteristics' },
  { id: '1.3.4', level: 'AA', name: 'Orientation' },
  { id: '1.3.5', level: 'AA', name: 'Identify Input Purpose' },
  { id: '1.4.1', level: 'A', name: 'Use of Color' },
  { id: '1.4.2', level: 'A', name: 'Audio Control' },
  { id: '1.4.3', level: 'AA', name: 'Contrast (Minimum)' },
  { id: '1.4.4', level: 'AA', name: 'Resize Text' },
  { id: '1.4.5', level: 'AA', name: 'Images of Text' },
  { id: '1.4.10', level: 'AA', name: 'Reflow' },
  { id: '1.4.11', level: 'AA', name: 'Non-text Contrast' },
  { id: '1.4.12', level: 'AA', name: 'Text Spacing' },
  { id: '1.4.13', level: 'AA', name: 'Content on Hover or Focus' },
  { id: '2.1.1', level: 'A', name: 'Keyboard' },
  { id: '2.1.2', level: 'A', name: 'No Keyboard Trap' },
  { id: '2.1.4', level: 'A', name: 'Character Key Shortcuts' },
  { id: '2.2.1', level: 'A', name: 'Timing Adjustable' },
  { id: '2.2.2', level: 'A', name: 'Pause, Stop, Hide' },
  { id: '2.3.1', level: 'A', name: 'Three Flashes or Below Threshold' },
  { id: '2.4.1', level: 'A', name: 'Bypass Blocks' },
  { id: '2.4.2', level: 'A', name: 'Page Titled' },
  { id: '2.4.3', level: 'A', name: 'Focus Order' },
  { id: '2.4.4', level: 'A', name: 'Link Purpose (In Context)' },
  { id: '2.4.5', level: 'AA', name: 'Multiple Ways' },
  { id: '2.4.6', level: 'AA', name: 'Headings and Labels' },
  { id: '2.4.7', level: 'AA', name: 'Focus Visible' },
  { id: '2.5.1', level: 'A', name: 'Pointer Gestures' },
  { id: '2.5.2', level: 'A', name: 'Pointer Cancellation' },
  { id: '2.5.3', level: 'A', name: 'Label in Name' },
  { id: '2.5.4', level: 'A', name: 'Motion Actuation' },
  { id: '3.1.1', level: 'A', name: 'Language of Page' },
  { id: '3.1.2', level: 'AA', name: 'Language of Parts' },
  { id: '3.2.1', level: 'A', name: 'On Focus' },
  { id: '3.2.2', level: 'A', name: 'On Input' },
  { id: '3.2.3', level: 'AA', name: 'Consistent Navigation' },
  { id: '3.2.4', level: 'AA', name: 'Consistent Identification' },
  { id: '3.3.1', level: 'A', name: 'Error Identification' },
  { id: '3.3.2', level: 'A', name: 'Labels or Instructions' },
  { id: '3.3.3', level: 'AA', name: 'Error Suggestion' },
  { id: '3.3.4', level: 'AA', name: 'Error Prevention (Legal, Financial, Data)' },
  { id: '4.1.1', level: 'A', name: 'Parsing' },
  { id: '4.1.2', level: 'A', name: 'Name, Role, Value' },
  { id: '4.1.3', level: 'AA', name: 'Status Messages' },
];

function getConformanceLevel(violations: Array<{ wcagCriteria: string | null; severity: string }>, criterionId: string): { level: string; label: string; count: number } {
  const matching = violations.filter(v => v.wcagCriteria === criterionId);
  if (matching.length === 0) return { level: 'na', label: 'Not Applicable', count: 0 };
  const hasCritical = matching.some(v => v.severity === 'critical');
  const hasSerious = matching.some(v => v.severity === 'serious');
  const count = matching.length;
  if (hasCritical || hasSerious) return { level: 'not-support', label: 'Does Not Support', count };
  if (count > 2) return { level: 'partial', label: 'Partially Supports', count };
  return { level: 'supports', label: 'Supports', count };
}

function VPATDocument({ data }: { data: {
  organization: string;
  productName: string;
  productVersion: string;
  reportDate: string;
  logoUrl?: string;
  violations: Array<{ wcagCriteria: string | null; severity: string }>;
  summary: { totalViolations: number; criteriaViolated: number };
} }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Voluntary Product Accessibility Template</Text>
            <Text style={styles.subtitle}>WCAG 2.1 AA Conformance Report</Text>
          </View>
          {data.logoUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text -- PDF image (react-pdf) has no alt support
            <Image style={styles.logo} src={data.logoUrl} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Information</Text>
          <View style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ width: '30%', color: '#6b7280' }}>Organization:</Text>
            <Text style={{ fontWeight: 'bold' }}>{data.organization}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ width: '30%', color: '#6b7280' }}>Product:</Text>
            <Text style={{ fontWeight: 'bold' }}>{data.productName}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ width: '30%', color: '#6b7280' }}>Version:</Text>
            <Text style={{ fontWeight: 'bold' }}>{data.productVersion}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ width: '30%', color: '#6b7280' }}>Report Date:</Text>
            <Text style={{ fontWeight: 'bold' }}>{data.reportDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conformance Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                {WCAG_CRITERIA.filter(c => getConformanceLevel(data.violations, c.id).level === 'supports').length}
              </Text>
              <Text style={styles.summaryLabel}>Supported</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#ca8a04' }]}>
                {WCAG_CRITERIA.filter(c => getConformanceLevel(data.violations, c.id).level === 'partial').length}
              </Text>
              <Text style={styles.summaryLabel}>Partial</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                {WCAG_CRITERIA.filter(c => getConformanceLevel(data.violations, c.id).level === 'not-support').length}
              </Text>
              <Text style={styles.summaryLabel}>Not Supported</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#6b7280' }]}>
                {WCAG_CRITERIA.filter(c => getConformanceLevel(data.violations, c.id).level === 'na').length}
              </Text>
              <Text style={styles.summaryLabel}>N/A</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WCAG 2.1 AA Conformance Table</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Criteria</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Level</Text>
            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Conformance</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Issues</Text>
          </View>
          {WCAG_CRITERIA.map((criterion, i) => {
            const conformance = getConformanceLevel(data.violations, criterion.id);
            const levelClass = conformance.level === 'supports' ? styles.supports :
              conformance.level === 'partial' ? styles.partial :
              conformance.level === 'not-support' ? styles.notSupport : styles.na;
            return (
              <View key={criterion.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: '10%' }]}>{criterion.id}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{criterion.level}</Text>
                <Text style={[styles.tableCell, { width: '50%' }]}>{criterion.name}</Text>
                <Text style={[styles.tableCell, { width: '15%' }, levelClass]}>{conformance.label}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{conformance.count || '-'}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>
            Generated by AccessGuard VPAT Generator • {data.reportDate}
            {'\n'}
            This VPAT documents accessibility conformance based on automated testing results.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        scans: {
          include: { violations: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const scan = project.scans[0];
    const violations = scan?.violations || [];
    const orgSettings = project.organization?.settings ? JSON.parse(project.organization.settings) : {};

    const criteriaViolated = new Set(violations.map(v => v.wcagCriteria).filter(Boolean)).size;

    const reportData = {
      organization: project.organization?.name || 'Unknown',
      productName: project.name,
      productVersion: '1.0',
      reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      logoUrl: orgSettings.logoUrl,
      violations: violations.map(v => ({ wcagCriteria: v.wcagCriteria, severity: v.severity })),
      summary: {
        totalViolations: violations.length,
        criteriaViolated,
      },
    };

    const { renderToBuffer } = await import('@react-pdf/renderer');
    const doc = React.createElement(VPATDocument, { data: reportData });
    const buffer = await renderToBuffer(doc as any);

    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'vpat_generated',
        metadata: JSON.stringify({
          projectId: project.id,
          violationCount: violations.length,
        }),
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vpat-${project.id}.pdf"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to generate VPAT' }, { status: 500 });
  }
}
