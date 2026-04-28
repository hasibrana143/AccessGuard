// AccessGuard PDF Report Templates
// Professional compliance reports for legal defense

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import type { Project, Violation, Scan } from '@/types';

// Register fonts for professional appearance
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v18/mem8YaGs126MiZpBA-UFVZ0b.woff2' },
  ],
});

// Color palette - AccessGuard brand colors
const COLORS = {
  primary: '#FF6B4A', // coral
  secondary: '#10B981', // emerald
  critical: '#EF4444',
  serious: '#F97316',
  moderate: '#EAB308',
  minor: '#3B82F6',
  text: '#1F2937',
  textMuted: '#6B7280',
  background: '#F9FAFB',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

// Create styles
const styles = StyleSheet.create({
  // Document
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logoSection: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  logoSubtext: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  documentInfo: {
    alignItems: 'flex-end',
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  documentMeta: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  documentId: {
    fontSize: 7,
    color: COLORS.textMuted,
    fontFamily: 'Courier',
    marginTop: 2,
  },
  
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  
  // Executive Summary
  summaryGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  summaryCardTitle: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryCardSubtext: {
    fontSize: 7,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // Compliance Score
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginBottom: 15,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scoreLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  scoreDetails: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  scoreDescription: {
    fontSize: 8,
    color: COLORS.textMuted,
    lineHeight: 1.5,
  },
  
  // Violations Summary
  violationsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  violationCard: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  violationCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  violationLabel: {
    fontSize: 7,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // Charts placeholder (we'll use text-based charts)
  chartContainer: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 8,
    marginBottom: 5,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
  },
  barLabel: {
    fontSize: 7,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  barValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  
  // Violations List
  violationItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  violationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  violationBadge: {
    fontSize: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 8,
  },
  violationMeta: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  violationDescription: {
    fontSize: 8,
    color: COLORS.text,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  violationLocation: {
    fontSize: 7,
    color: COLORS.textMuted,
    fontFamily: 'Courier',
    backgroundColor: COLORS.background,
    padding: 4,
    borderRadius: 2,
  },
  
  // WCAG Compliance
  wcagGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  wcagColumn: {
    flex: 1,
  },
  wcagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wcagCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  wcagText: {
    fontSize: 8,
    color: COLORS.text,
  },
  
  // Legal Attestation
  attestationBox: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  attestationTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  attestationText: {
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  attestationHash: {
    fontSize: 7,
    color: COLORS.textMuted,
    fontFamily: 'Courier',
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 2,
    marginTop: 10,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textMuted,
  },
  pageNumber: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  
  // Status indicators
  statusOpen: {
    color: COLORS.critical,
  },
  statusFixed: {
    color: COLORS.secondary,
  },
  
  // Tables
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.text,
  },
  
  // Remediation section
  remediationItem: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
  },
  remediationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  remediationStatus: {
    fontSize: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  remediationCode: {
    fontSize: 7,
    fontFamily: 'Courier',
    backgroundColor: COLORS.white,
    padding: 6,
    borderRadius: 2,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
});

// ============================================================================
// COMPONENTS
// ============================================================================

interface ReportHeaderProps {
  organizationName: string;
  projectName: string;
  projectUrl: string;
  reportDate: string;
  documentId: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  organizationName,
  projectName,
  projectUrl,
  reportDate,
  documentId,
}) => (
  <View style={styles.header}>
    <View style={styles.logoSection}>
      <Text style={styles.logoText}>AccessGuard</Text>
      <Text style={styles.logoSubtext}>Legal Shield™ Compliance Report</Text>
    </View>
    <View style={styles.documentInfo}>
      <Text style={styles.documentTitle}>{projectName}</Text>
      <Text style={styles.documentMeta}>{organizationName}</Text>
      <Text style={styles.documentMeta}>{projectUrl}</Text>
      <Text style={styles.documentMeta}>Generated: {reportDate}</Text>
      <Text style={styles.documentId}>Document ID: {documentId}</Text>
    </View>
  </View>
);

interface ExecutiveSummaryProps {
  complianceScore: number;
  riskLevel: string;
  totalViolations: number;
  openViolations: number;
  fixedViolations: number;
  scanDate: string;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  complianceScore,
  riskLevel,
  totalViolations,
  openViolations,
  fixedViolations,
  scanDate,
}) => {
  const scoreColor = complianceScore >= 80 ? COLORS.secondary : 
    complianceScore >= 60 ? COLORS.moderate : 
    complianceScore >= 40 ? COLORS.serious : COLORS.critical;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      
      <View style={styles.scoreContainer}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreValue, { color: scoreColor }]}>{complianceScore}%</Text>
          <Text style={styles.scoreLabel}>WCAG 2.1 AA</Text>
        </View>
        <View style={styles.scoreDetails}>
          <Text style={styles.scoreTitle}>
            {riskLevel} Risk Level
          </Text>
          <Text style={styles.scoreDescription}>
            This report presents the accessibility compliance status for your website.
            A score of {complianceScore}% indicates {riskLevel.toLowerCase()} risk of ADA litigation.
            {openViolations > 0 && ` ${openViolations} violations require attention.`}
            {fixedViolations > 0 && ` ${fixedViolations} violations have been successfully remediated.`}
          </Text>
        </View>
      </View>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Total Violations</Text>
          <Text style={styles.summaryCardValue}>{totalViolations}</Text>
          <Text style={styles.summaryCardSubtext}>Found in last scan</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Open Issues</Text>
          <Text style={[styles.summaryCardValue, { color: COLORS.critical }]}>{openViolations}</Text>
          <Text style={styles.summaryCardSubtext}>Require attention</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Fixed Issues</Text>
          <Text style={[styles.summaryCardValue, { color: COLORS.secondary }]}>{fixedViolations}</Text>
          <Text style={styles.summaryCardSubtext}>Successfully resolved</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Last Scan</Text>
          <Text style={styles.summaryCardValue}>{scanDate}</Text>
          <Text style={styles.summaryCardSubtext}>Automated audit</Text>
        </View>
      </View>
    </View>
  );
};

interface ViolationsSummaryProps {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  open: number;
  fixed: number;
  ignored: number;
}

export const ViolationsSummary: React.FC<ViolationsSummaryProps> = ({
  critical,
  serious,
  moderate,
  minor,
  open,
  fixed,
  ignored,
}) => {
  const total = critical + serious + moderate + minor;
  const maxValue = Math.max(critical, serious, moderate, minor, 1);
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Violations Summary</Text>
      
      {/* Severity Breakdown */}
      <View style={styles.violationsGrid}>
        <View style={[styles.violationCard, { backgroundColor: `${COLORS.critical}15` }]}>
          <Text style={[styles.violationCount, { color: COLORS.critical }]}>{critical}</Text>
          <Text style={styles.violationLabel}>Critical</Text>
        </View>
        <View style={[styles.violationCard, { backgroundColor: `${COLORS.serious}15` }]}>
          <Text style={[styles.violationCount, { color: COLORS.serious }]}>{serious}</Text>
          <Text style={styles.violationLabel}>Serious</Text>
        </View>
        <View style={[styles.violationCard, { backgroundColor: `${COLORS.moderate}15` }]}>
          <Text style={[styles.violationCount, { color: COLORS.moderate }]}>{moderate}</Text>
          <Text style={styles.violationLabel}>Moderate</Text>
        </View>
        <View style={[styles.violationCard, { backgroundColor: `${COLORS.minor}15` }]}>
          <Text style={[styles.violationCount, { color: COLORS.minor }]}>{minor}</Text>
          <Text style={styles.violationLabel}>Minor</Text>
        </View>
      </View>
      
      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Violations by Severity</Text>
        <View style={styles.barChart}>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { height: `${(critical / maxValue) * 100}%`, backgroundColor: COLORS.critical }]} />
            <Text style={styles.barLabel}>Critical</Text>
            <Text style={styles.barValue}>{critical}</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { height: `${(serious / maxValue) * 100}%`, backgroundColor: COLORS.serious }]} />
            <Text style={styles.barLabel}>Serious</Text>
            <Text style={styles.barValue}>{serious}</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { height: `${(moderate / maxValue) * 100}%`, backgroundColor: COLORS.moderate }]} />
            <Text style={styles.barLabel}>Moderate</Text>
            <Text style={styles.barValue}>{moderate}</Text>
          </View>
          <View style={styles.barContainer}>
            <View style={[styles.bar, { height: `${(minor / maxValue) * 100}%`, backgroundColor: COLORS.minor }]} />
            <Text style={styles.barLabel}>Minor</Text>
            <Text style={styles.barValue}>{minor}</Text>
          </View>
        </View>
      </View>
      
      {/* Status Breakdown */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Open</Text>
          <Text style={[styles.summaryCardValue, { color: COLORS.critical }]}>{open}</Text>
          <Text style={styles.summaryCardSubtext}>{((open / total) * 100).toFixed(1)}% of total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Fixed</Text>
          <Text style={[styles.summaryCardValue, { color: COLORS.secondary }]}>{fixed}</Text>
          <Text style={styles.summaryCardSubtext}>{((fixed / total) * 100).toFixed(1)}% of total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Ignored</Text>
          <Text style={styles.summaryCardValue}>{ignored}</Text>
          <Text style={styles.summaryCardSubtext}>Manually excluded</Text>
        </View>
      </View>
    </View>
  );
};

interface ViolationsListProps {
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
  }>;
  maxItems?: number;
}

export const ViolationsList: React.FC<ViolationsListProps> = ({ 
  violations,
  maxItems = 20 
}) => {
  const displayViolations = violations.slice(0, maxItems);
  const remaining = violations.length - maxItems;
  
  const getSeverityStyle = (severity: string) => {
    const colors: Record<string, string> = {
      critical: COLORS.critical,
      serious: COLORS.serious,
      moderate: COLORS.moderate,
      minor: COLORS.minor,
    };
    return { color: colors[severity] || COLORS.textMuted };
  };
  
  const getSeverityBg = (severity: string) => {
    const colors: Record<string, string> = {
      critical: `${COLORS.critical}20`,
      serious: `${COLORS.serious}20`,
      moderate: `${COLORS.moderate}20`,
      minor: `${COLORS.minor}20`,
    };
    return { backgroundColor: colors[severity] || COLORS.background };
  };
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Detailed Violations ({violations.length} total)
      </Text>
      
      {displayViolations.map((violation, index) => (
        <View key={violation.id || index} style={styles.violationItem}>
          <View style={styles.violationHeader}>
            <Text style={styles.violationTitle}>
              {violation.ruleId.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Text>
            <Text style={[
              styles.violationBadge,
              getSeverityStyle(violation.severity),
              getSeverityBg(violation.severity)
            ]}>
              {violation.severity.toUpperCase()}
            </Text>
          </View>
          
          <Text style={styles.violationMeta}>
            WCAG {violation.wcagCriteria || 'N/A'} • Status: {violation.status}
          </Text>
          
          <Text style={styles.violationDescription}>
            {violation.description}
          </Text>
          
          {violation.elementSelector && (
            <Text style={styles.violationLocation}>
              {violation.elementSelector}
            </Text>
          )}
          
          {violation.remediationCode && (
            <Text style={styles.remediationCode}>
              {violation.remediationCode.substring(0, 200)}
              {violation.remediationCode.length > 200 ? '...' : ''}
            </Text>
          )}
        </View>
      ))}
      
      {remaining > 0 && (
        <View style={[styles.violationItem, { backgroundColor: COLORS.background }]}>
          <Text style={[styles.violationTitle, { textAlign: 'center' }]}>
            +{remaining} more violations not shown in this summary
          </Text>
        </View>
      )}
    </View>
  );
};

interface RemediationSectionProps {
  fixedViolations: Array<{
    id: string;
    ruleId: string;
    description: string;
    remediationCode: string | null;
    fixedAt: string | null;
  }>;
  pendingViolations: Array<{
    id: string;
    ruleId: string;
    severity: string;
    description: string;
  }>;
}

export const RemediationSection: React.FC<RemediationSectionProps> = ({
  fixedViolations,
  pendingViolations,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Remediation Status</Text>
    
    {/* Fixed Violations */}
    {fixedViolations.length > 0 && (
      <>
        <Text style={[styles.chartTitle, { marginBottom: 8 }]}>
          Fixed Violations ({fixedViolations.length})
        </Text>
        {fixedViolations.slice(0, 10).map((violation, index) => (
          <View key={violation.id || index} style={styles.remediationItem}>
            <View style={styles.remediationHeader}>
              <Text style={styles.violationTitle}>
                {violation.ruleId.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
              <Text style={[styles.remediationStatus, { 
                backgroundColor: `${COLORS.secondary}20`,
                color: COLORS.secondary 
              }]}>
                FIXED
              </Text>
            </View>
            <Text style={styles.violationDescription}>
              {violation.description}
            </Text>
            {violation.fixedAt && (
              <Text style={styles.violationMeta}>
                Fixed: {new Date(violation.fixedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        ))}
      </>
    )}
    
    {/* Pending Violations */}
    {pendingViolations.length > 0 && (
      <>
        <Text style={[styles.chartTitle, { marginTop: 15, marginBottom: 8 }]}>
          Pending Remediation ({pendingViolations.length})
        </Text>
        {pendingViolations.slice(0, 10).map((violation, index) => (
          <View key={violation.id || index} style={styles.remediationItem}>
            <View style={styles.remediationHeader}>
              <Text style={styles.violationTitle}>
                {violation.ruleId.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
              <Text style={[styles.remediationStatus, { 
                backgroundColor: `${COLORS.critical}20`,
                color: COLORS.critical 
              }]}>
                PENDING
              </Text>
            </View>
            <Text style={styles.violationDescription}>
              {violation.description}
            </Text>
          </View>
        ))}
      </>
    )}
  </View>
);

interface WCAGComplianceSectionProps {
  wcagCriteria: Array<{
    criterion: string;
    name: string;
    level: string;
    status: 'pass' | 'fail' | 'not-tested';
  }>;
}

export const WCAGComplianceSection: React.FC<WCAGComplianceSectionProps> = ({
  wcagCriteria,
}) => {
  const levelA = wcagCriteria.filter(c => c.level === 'A');
  const levelAA = wcagCriteria.filter(c => c.level === 'AA');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return COLORS.secondary;
      case 'fail': return COLORS.critical;
      default: return COLORS.textMuted;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓';
      case 'fail': return '✗';
      default: return '○';
    }
  };
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>WCAG 2.1 Compliance Criteria</Text>
      
      <View style={styles.wcagGrid}>
        <View style={styles.wcagColumn}>
          <Text style={[styles.chartTitle, { marginBottom: 8 }]}>Level A Criteria</Text>
          {levelA.map((item, index) => (
            <View key={index} style={styles.wcagItem}>
              <View style={[styles.wcagCheck, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.wcagText}>
                {getStatusIcon(item.status)} {item.criterion} - {item.name}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.wcagColumn}>
          <Text style={[styles.chartTitle, { marginBottom: 8 }]}>Level AA Criteria</Text>
          {levelAA.map((item, index) => (
            <View key={index} style={styles.wcagItem}>
              <View style={[styles.wcagCheck, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={styles.wcagText}>
                {getStatusIcon(item.status)} {item.criterion} - {item.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

interface LegalAttestationProps {
  organizationName: string;
  projectName: string;
  reportDate: string;
  complianceScore: number;
  documentHash: string;
}

export const LegalAttestation: React.FC<LegalAttestationProps> = ({
  organizationName,
  projectName,
  reportDate,
  complianceScore,
  documentHash,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Legal Attestation</Text>
    
    <View style={styles.attestationBox}>
      <Text style={styles.attestationTitle}>Legal Shield™ Certification</Text>
      
      <Text style={styles.attestationText}>
        This report certifies that {organizationName} has conducted accessibility testing 
        on {reportDate} in accordance with WCAG 2.1 AA guidelines. This document serves as 
        evidence of ongoing compliance efforts and demonstrates a commitment to digital 
        accessibility.
      </Text>
      
      <Text style={styles.attestationText}>
        The website "{projectName}" has achieved a compliance score of {complianceScore}%. 
        This score reflects the current state of accessibility at the time of testing and 
        should be considered in conjunction with ongoing remediation efforts.
      </Text>
      
      <Text style={styles.attestationText}>
        This report is generated automatically by AccessGuard's accessibility scanning 
        platform and includes cryptographic verification for authenticity. The timestamp 
        and document hash below can be used to verify the integrity of this document.
      </Text>
      
      <Text style={styles.attestationHash}>
        Document Hash: {documentHash}{'\n'}
        Generated: {reportDate}{'\n'}
        Platform: AccessGuard Legal Shield™ v2.0
      </Text>
    </View>
  </View>
);

// Footer Component
export const ReportFooter: React.FC<{ pageNumber: number; totalPages: number }> = ({ 
  pageNumber, 
  totalPages 
}) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerText}>
      © {new Date().getFullYear()} AccessGuard. Confidential - For Legal Use.
    </Text>
    <Text style={styles.pageNumber}>
      Page {pageNumber} of {totalPages}
    </Text>
  </View>
);

// ============================================================================
// MAIN REPORT DOCUMENT
// ============================================================================

interface AccessGuardReportProps {
  organizationName: string;
  project: {
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
  reportDate: string;
  documentId: string;
  documentHash: string;
}

export const AccessGuardReport: React.FC<AccessGuardReportProps> = ({
  organizationName,
  project,
  scans,
  violations,
  reportDate,
  documentId,
  documentHash,
}) => {
  // Calculate statistics
  const severityCounts = {
    critical: violations.filter(v => v.severity === 'critical').length,
    serious: violations.filter(v => v.severity === 'serious').length,
    moderate: violations.filter(v => v.severity === 'moderate').length,
    minor: violations.filter(v => v.severity === 'minor').length,
  };
  
  const statusCounts = {
    open: violations.filter(v => v.status === 'open').length,
    fixed: violations.filter(v => v.status === 'fixed').length,
    ignored: violations.filter(v => v.status === 'ignored').length,
  };
  
  const complianceScore = project.riskScore ?? 
    Math.max(0, 100 - (severityCounts.critical * 10) - (severityCounts.serious * 5) - 
      (severityCounts.moderate * 2) - (severityCounts.minor));
  
  const riskLevel = complianceScore >= 80 ? 'Low' : 
    complianceScore >= 60 ? 'Medium' : 
    complianceScore >= 40 ? 'High' : 'Critical';
  
  const fixedViolations = violations.filter(v => v.status === 'fixed');
  const pendingViolations = violations.filter(v => v.status === 'open');
  
  // Generate WCAG criteria status
  const wcagCriteria = [
    { criterion: '1.1.1', name: 'Non-text Content', level: 'A', status: violations.some(v => v.wcagCriteria === '1.1.1' && v.status === 'open') ? 'fail' : 'pass' as const },
    { criterion: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', status: violations.some(v => v.wcagCriteria === '1.4.3' && v.status === 'open') ? 'fail' : 'pass' as const },
    { criterion: '2.1.1', name: 'Keyboard', level: 'A', status: violations.some(v => v.wcagCriteria === '2.1.1' && v.status === 'open') ? 'fail' : 'pass' as const },
    { criterion: '2.4.6', name: 'Headings and Labels', level: 'AA', status: violations.some(v => v.wcagCriteria === '2.4.6' && v.status === 'open') ? 'fail' : 'pass' as const },
    { criterion: '3.3.2', name: 'Labels or Instructions', level: 'A', status: violations.some(v => v.wcagCriteria === '3.3.2' && v.status === 'open') ? 'fail' : 'pass' as const },
    { criterion: '4.1.2', name: 'Name, Role, Value', level: 'A', status: violations.some(v => v.wcagCriteria === '4.1.2' && v.status === 'open') ? 'fail' : 'pass' as const },
  ];
  
  const scanDate = project.lastScanAt ? 
    new Date(project.lastScanAt).toLocaleDateString() : 
    (scans[0]?.completedAt ? new Date(scans[0].completedAt).toLocaleDateString() : 'N/A');
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          organizationName={organizationName}
          projectName={project.name}
          projectUrl={project.url}
          reportDate={reportDate}
          documentId={documentId}
        />
        
        <ExecutiveSummary
          complianceScore={complianceScore}
          riskLevel={riskLevel}
          totalViolations={violations.length}
          openViolations={statusCounts.open}
          fixedViolations={statusCounts.fixed}
          scanDate={scanDate}
        />
        
        <ViolationsSummary
          critical={severityCounts.critical}
          serious={severityCounts.serious}
          moderate={severityCounts.moderate}
          minor={severityCounts.minor}
          open={statusCounts.open}
          fixed={statusCounts.fixed}
          ignored={statusCounts.ignored}
        />
        
        <ReportFooter pageNumber={1} totalPages={3} />
      </Page>
      
      <Page size="A4" style={styles.page}>
        <ReportHeader
          organizationName={organizationName}
          projectName={project.name}
          projectUrl={project.url}
          reportDate={reportDate}
          documentId={documentId}
        />
        
        <ViolationsList violations={violations} maxItems={25} />
        
        <ReportFooter pageNumber={2} totalPages={3} />
      </Page>
      
      <Page size="A4" style={styles.page}>
        <ReportHeader
          organizationName={organizationName}
          projectName={project.name}
          projectUrl={project.url}
          reportDate={reportDate}
          documentId={documentId}
        />
        
        <RemediationSection
          fixedViolations={fixedViolations}
          pendingViolations={pendingViolations}
        />
        
        <WCAGComplianceSection wcagCriteria={wcagCriteria} />
        
        <LegalAttestation
          organizationName={organizationName}
          projectName={project.name}
          reportDate={reportDate}
          complianceScore={complianceScore}
          documentHash={documentHash}
        />
        
        <ReportFooter pageNumber={3} totalPages={3} />
      </Page>
    </Document>
  );
};

export default AccessGuardReport;
