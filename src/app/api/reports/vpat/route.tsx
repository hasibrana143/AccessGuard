import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';
import { generateVPATData, VPAT_CONFORMANCE_LABELS, type VPATData } from '@/lib/vpat-generator';

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
  draftLabel: { fontSize: 9, fontWeight: 'bold', color: '#b45309', marginTop: 4 },
  logo: { width: 50, height: 50, objectFit: 'contain', marginLeft: 10 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, backgroundColor: '#dbeafe', padding: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 6 },
  tableHeaderCell: { color: 'white', fontWeight: 'bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e5e7eb', padding: 5 },
  tableRowAlt: { flexDirection: 'row', borderBottom: '1px solid #e5e7eb', padding: 5, backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 8 },
  remarks: { fontSize: 7, color: '#4b5563' },
  supports: { color: '#16a34a', fontWeight: 'bold' },
  partial: { color: '#ca8a04', fontWeight: 'bold' },
  notSupport: { color: '#dc2626', fontWeight: 'bold' },
  notEvaluated: { color: '#6b7280' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: '1px solid #e5e7eb', paddingTop: 10, fontSize: 7, color: '#9ca3af', textAlign: 'center' },
  summaryBox: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  summaryItem: { alignItems: 'center', padding: 8, backgroundColor: '#f3f4f6', borderRadius: 4, width: '22%' },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { fontSize: 8, color: '#6b7280', marginTop: 2 },
});

const CONFORMANCE_STYLE: Record<string, string> = {
  supports: 'supports',
  'partially-supports': 'partial',
  'does-not-support': 'notSupport',
  'not-evaluated': 'notEvaluated',
};

function VPATDocument({ data }: { data: {
  organization: string;
  productName: string;
  productVersion: string;
  reportDate: string;
  logoUrl?: string;
  vpat: VPATData;
} }) {
  const { vpat } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Voluntary Product Accessibility Template</Text>
            <Text style={styles.subtitle}>{vpat.meta.standard} Conformance Report</Text>
            <Text style={styles.draftLabel}>DRAFT - human review required</Text>
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
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{vpat.summary.supports}</Text>
              <Text style={styles.summaryLabel}>Supports</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#ca8a04' }]}>{vpat.summary.partiallySupports}</Text>
              <Text style={styles.summaryLabel}>Partially Supports</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{vpat.summary.doesNotSupport}</Text>
              <Text style={styles.summaryLabel}>Does Not Support</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#6b7280' }]}>{vpat.summary.notEvaluated}</Text>
              <Text style={styles.summaryLabel}>Not Evaluated</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{vpat.meta.standard} Conformance Table</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Criteria</Text>
            <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Level</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Conformance</Text>
            <Text style={[styles.tableHeaderCell, { width: '36%' }]}>Remarks</Text>
          </View>
          {vpat.criteria.map((criterion, i) => {
            const levelClass = styles[CONFORMANCE_STYLE[criterion.conformance] ?? 'notEvaluated'];
            return (
              <View key={criterion.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: '10%' }]}>{criterion.id}</Text>
                <Text style={[styles.tableCell, { width: '8%' }]}>{criterion.level}</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>{criterion.name}</Text>
                <Text style={[styles.tableCell, { width: '16%' }, levelClass]}>
                  {VPAT_CONFORMANCE_LABELS[criterion.conformance]}
                </Text>
                <Text style={[styles.remarks, { width: '36%' }]}>{criterion.remarks}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>
            Generated by AccessGuard VPAT Generator • {data.reportDate}
            {'\n'}
            DRAFT - human review required. This draft reflects automated test results only.
            Criteria marked "Not Evaluated" were not assessed by the automated scan and
            require manual testing. A final Accessibility Conformance Report must be
            completed and signed by the organization before it is used for procurement.
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
      include: { organization: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const orgSettings = project.organization?.settings ? JSON.parse(project.organization.settings) : {};

    // One generator for every VPAT surface: the PDF, the API and onboarding all read
    // the same conformance and remarks, so a criterion that was never assessed is
    // reported as not evaluated instead of being ruled out of scope.
    const vpat = await generateVPATData(projectId);

    const reportData = {
      organization: project.organization?.name || 'Unknown',
      productName: project.name,
      productVersion: '1.0',
      reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      logoUrl: orgSettings.logoUrl,
      vpat,
    };

    const { renderToBuffer } = await import('@react-pdf/renderer');
    const doc = React.createElement(VPATDocument, { data: reportData });
    const buffer = await renderToBuffer(doc as React.ReactElement<any>);

    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'vpat_generated',
        metadata: JSON.stringify({
          projectId: project.id,
          criteriaCount: vpat.criteria.length,
          notEvaluated: vpat.summary.notEvaluated,
          draft: true,
        }),
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="vpat-${project.id}-draft.pdf"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to generate VPAT' }, { status: 500 });
  }
}
