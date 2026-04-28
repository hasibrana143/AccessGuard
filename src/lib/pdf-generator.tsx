// AccessGuard PDF Report Generator
// Generates professional compliance reports for legal defense

import { renderToStream, renderToString } from '@react-pdf/renderer';
import { AccessGuardReport } from './pdf-templates';
import type { Project, Violation, Scan } from '@/types';
import crypto from 'crypto';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique document ID for the report
 * Format: AG-{YEAR}-{MONTH}-{RANDOM}
 */
export function generateReportId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `AG-${year}${month}-${random}`;
}

/**
 * Format a date for legal documents
 * Returns a formal date string suitable for legal documents
 */
export function formatReportDate(date: Date | string | null): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Generate a cryptographic hash for document authenticity
 */
export function generateDocumentHash(
  documentId: string,
  reportDate: string,
  complianceScore: number,
  projectId: string,
  violationsCount: number
): string {
  const data = `${documentId}|${reportDate}|${complianceScore}|${projectId}|${violationsCount}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32).toUpperCase();
}

/**
 * Calculate compliance score from violations
 */
export function calculateComplianceScore(violations: Violation[]): number {
  const weights = {
    critical: 10,
    serious: 5,
    moderate: 2,
    minor: 1,
  };
  
  const totalDeduction = violations
    .filter(v => v.status === 'open')
    .reduce((sum, v) => sum + (weights[v.severity] || 0), 0);
  
  return Math.max(0, Math.min(100, 100 - totalDeduction));
}

/**
 * Determine risk level from compliance score
 */
export function getRiskLevel(score: number): string {
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'High';
  return 'Critical';
}

// ============================================================================
// REPORT DATA TYPES
// ============================================================================

export interface ReportData {
  organizationName: string;
  project: {
    id: string;
    name: string;
    url: string;
    lastScanAt: string | null;
    riskScore: number | null;
  };
  scans: Array<{
    id: string;
    startedAt: string;
    completedAt: string | null;
    pagesScanned: number;
    violationsFound: number;
    status: string;
  }>;
  violations: Array<{
    id: string;
    ruleId: string;
    wcagCriteria: string | null;
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    url: string;
    elementSelector: string | null;
    description: string;
    remediationCode: string | null;
    status: string;
    fixedAt: string | null;
  }>;
  reportType: 'full' | 'summary' | 'legal';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface GeneratedReport {
  documentId: string;
  reportDate: string;
  documentHash: string;
  complianceScore: number;
  riskLevel: string;
  violationsCount: number;
  openCount: number;
  fixedCount: number;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate a compliance report PDF
 * Returns a ReadableStream containing the PDF data
 */
export async function generateComplianceReport(
  data: ReportData
): Promise<{ stream: ReadableStream<Uint8Array>; metadata: GeneratedReport }> {
  const documentId = generateReportId();
  const reportDate = formatReportDate(new Date());
  
  // Calculate compliance score if not provided
  const complianceScore = data.project.riskScore ?? 
    calculateComplianceScore(data.violations as Violation[]);
  
  const documentHash = generateDocumentHash(
    documentId,
    reportDate,
    complianceScore,
    data.project.id,
    data.violations.length
  );
  
  // Create the PDF document
  const doc = (
    <AccessGuardReport
      organizationName={data.organizationName}
      project={data.project}
      scans={data.scans}
      violations={data.violations}
      reportDate={reportDate}
      documentId={documentId}
      documentHash={documentHash}
    />
  );
  
  // Generate PDF stream
  const stream = await renderToStream(doc);
  
  // Prepare metadata
  const metadata: GeneratedReport = {
    documentId,
    reportDate,
    documentHash,
    complianceScore,
    riskLevel: getRiskLevel(complianceScore),
    violationsCount: data.violations.length,
    openCount: data.violations.filter(v => v.status === 'open').length,
    fixedCount: data.violations.filter(v => v.status === 'fixed').length,
  };
  
  return { stream, metadata };
}

/**
 * Generate a summary report (single page, high-level overview)
 */
export async function generateSummaryReport(
  data: ReportData
): Promise<{ stream: ReadableStream<Uint8Array>; metadata: GeneratedReport }> {
  // For summary, only include open violations
  const summaryData: ReportData = {
    ...data,
    violations: data.violations.filter(v => v.status === 'open'),
  };
  
  return generateComplianceReport(summaryData);
}

/**
 * Generate a legal report (focused on legal attestation)
 */
export async function generateLegalReport(
  data: ReportData
): Promise<{ stream: ReadableStream<Uint8Array>; metadata: GeneratedReport }> {
  // For legal reports, include all violations with full details
  return generateComplianceReport(data);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert stream to buffer
 */
export async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return Buffer.concat(chunks);
}

/**
 * Get content type for PDF
 */
export function getPDFContentType(): string {
  return 'application/pdf';
}

/**
 * Get filename for report download
 */
export function getReportFilename(
  projectName: string,
  reportType: string,
  documentId: string
): string {
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const date = new Date().toISOString().split('T')[0];
  return `accessguard-${sanitized}-${reportType}-${date}-${documentId}.pdf`;
}

/**
 * Validate report data before generation
 */
export function validateReportData(data: ReportData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.organizationName) {
    errors.push('Organization name is required');
  }
  
  if (!data.project.name) {
    errors.push('Project name is required');
  }
  
  if (!data.project.url) {
    errors.push('Project URL is required');
  }
  
  if (!['full', 'summary', 'legal'].includes(data.reportType)) {
    errors.push('Invalid report type. Must be "full", "summary", or "legal"');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export const pdfGenerator = {
  generateReportId,
  formatReportDate,
  generateDocumentHash,
  calculateComplianceScore,
  getRiskLevel,
  generateComplianceReport,
  generateSummaryReport,
  generateLegalReport,
  streamToBuffer,
  getPDFContentType,
  getReportFilename,
  validateReportData,
};
