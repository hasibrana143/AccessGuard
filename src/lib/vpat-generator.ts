import { db } from './db';

// WCAG 2.2 AA criteria (extends 2.1 AA)
const WCAG22_CRITERIA: Array<{ id: string; level: string; name: string }> = [
  // WCAG 2.1 A
  { id: '1.1.1', level: 'A', name: 'Non-text Content' },
  { id: '1.2.1', level: 'A', name: 'Audio-only and Video-only (Prerecorded)' },
  { id: '1.2.2', level: 'A', name: 'Captions (Prerecorded)' },
  { id: '1.2.3', level: 'A', name: 'Audio Description or Media Alternative (Prerecorded)' },
  { id: '1.3.1', level: 'A', name: 'Info and Relationships' },
  { id: '1.3.2', level: 'A', name: 'Meaningful Sequence' },
  { id: '1.3.3', level: 'A', name: 'Sensory Characteristics' },
  { id: '1.4.1', level: 'A', name: 'Use of Color' },
  { id: '1.4.2', level: 'A', name: 'Audio Control' },
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
  { id: '2.5.1', level: 'A', name: 'Pointer Gestures' },
  { id: '2.5.2', level: 'A', name: 'Pointer Cancellation' },
  { id: '2.5.3', level: 'A', name: 'Label in Name' },
  { id: '2.5.4', level: 'A', name: 'Motion Actuation' },
  { id: '3.1.1', level: 'A', name: 'Language of Page' },
  { id: '3.2.1', level: 'A', name: 'On Focus' },
  { id: '3.2.2', level: 'A', name: 'On Input' },
  { id: '3.3.1', level: 'A', name: 'Error Identification' },
  { id: '3.3.2', level: 'A', name: 'Labels or Instructions' },
  { id: '4.1.1', level: 'A', name: 'Parsing' },
  { id: '4.1.2', level: 'A', name: 'Name, Role, Value' },

  // WCAG 2.1 AA
  { id: '1.2.4', level: 'AA', name: 'Captions (Live)' },
  { id: '1.2.5', level: 'AA', name: 'Audio Description (Prerecorded)' },
  { id: '1.3.4', level: 'AA', name: 'Orientation' },
  { id: '1.3.5', level: 'AA', name: 'Identify Input Purpose' },
  { id: '1.4.3', level: 'AA', name: 'Contrast (Minimum)' },
  { id: '1.4.4', level: 'AA', name: 'Resize Text' },
  { id: '1.4.5', level: 'AA', name: 'Images of Text' },
  { id: '1.4.10', level: 'AA', name: 'Reflow' },
  { id: '1.4.11', level: 'AA', name: 'Non-text Contrast' },
  { id: '1.4.12', level: 'AA', name: 'Text Spacing' },
  { id: '1.4.13', level: 'AA', name: 'Content on Hover or Focus' },
  { id: '2.4.5', level: 'AA', name: 'Multiple Ways' },
  { id: '2.4.6', level: 'AA', name: 'Headings and Labels' },
  { id: '2.4.7', level: 'AA', name: 'Focus Visible' },
  { id: '3.1.2', level: 'AA', name: 'Language of Parts' },
  { id: '3.2.3', level: 'AA', name: 'Consistent Navigation' },
  { id: '3.2.4', level: 'AA', name: 'Consistent Identification' },
  { id: '3.3.3', level: 'AA', name: 'Error Suggestion' },
  { id: '3.3.4', level: 'AA', name: 'Error Prevention (Legal, Financial, Data)' },
  { id: '4.1.3', level: 'AA', name: 'Status Messages' },

  // WCAG 2.2 AA (additional)
  { id: '2.4.11', level: 'AA', name: 'Focus Not Obscured (Minimum)' },
  { id: '2.4.12', level: 'AA', name: 'Focus Not Obscured (Enhanced)' },
  { id: '2.5.7', level: 'AA', name: 'Dragging Movements' },
  { id: '2.5.8', level: 'AA', name: 'Target Size (Minimum)' },
  { id: '3.2.6', level: 'AA', name: 'Consistent Help' },
  { id: '3.3.7', level: 'AA', name: 'Redundant Entry' },
  { id: '3.3.8', level: 'AA', name: 'Accessible Authentication (Minimum)' },
];

// EN 301 549 mapping (EU accessibility standard)
const EN301549_MAPPING: Record<string, string[]> = {
  '1.1.1': ['9.1.1.1', '11.1.1.1'],
  '1.2.1': ['9.1.2.1', '11.1.2.1'],
  '1.2.2': ['9.1.2.2', '11.1.2.2'],
  '1.2.3': ['9.1.2.3', '11.1.2.3'],
  '1.2.4': ['9.1.2.4', '11.1.2.4'],
  '1.2.5': ['9.1.2.5', '11.1.2.5'],
  '1.3.1': ['9.1.3.1', '11.1.3.1'],
  '1.3.2': ['9.1.3.2', '11.1.3.2'],
  '1.3.3': ['9.1.3.3', '11.1.3.3'],
  '1.4.1': ['9.1.4.1', '11.1.4.1'],
  '1.4.2': ['9.1.4.2', '11.1.4.2'],
  '1.4.3': ['9.1.4.3', '11.1.4.3'],
  '1.4.4': ['9.1.4.4', '11.1.4.4'],
  '1.4.5': ['9.1.4.5', '11.1.4.5'],
  '2.1.1': ['9.2.1.1', '11.2.1.1'],
  '2.1.2': ['9.2.1.2', '11.2.1.2'],
  '2.1.4': ['9.2.1.4', '11.2.1.4'],
  '2.2.1': ['9.2.2.1', '11.2.2.1'],
  '2.2.2': ['9.2.2.2', '11.2.2.2'],
  '2.3.1': ['9.2.3.1', '11.2.3.1'],
  '2.4.1': ['9.2.4.1', '11.2.4.1'],
  '2.4.2': ['9.2.4.2', '11.2.4.2'],
  '2.4.3': ['9.2.4.3', '11.2.4.3'],
  '2.4.4': ['9.2.4.4', '11.2.4.4'],
  '2.4.5': ['9.2.4.5', '11.2.4.5'],
  '2.4.6': ['9.2.4.6', '11.2.4.6'],
  '2.4.7': ['9.2.4.7', '11.2.4.7'],
  '2.5.1': ['9.2.5.1', '11.2.5.1'],
  '2.5.2': ['9.2.5.2', '11.2.5.2'],
  '2.5.3': ['9.2.5.3', '11.2.5.3'],
  '2.5.4': ['9.2.5.4', '11.2.5.4'],
  '3.1.1': ['9.3.1.1', '11.3.1.1'],
  '3.1.2': ['9.3.1.2', '11.3.1.2'],
  '3.2.1': ['9.3.2.1', '11.3.2.1'],
  '3.2.2': ['9.3.2.2', '11.3.2.2'],
  '3.2.3': ['9.3.2.3', '11.3.2.3'],
  '3.2.4': ['9.3.2.4', '11.3.2.4'],
  '3.3.1': ['9.3.3.1', '11.3.3.1'],
  '3.3.2': ['9.3.3.2', '11.3.3.2'],
  '3.3.3': ['9.3.3.3', '11.3.3.3'],
  '3.3.4': ['9.3.3.4', '11.3.3.4'],
  '4.1.1': ['9.4.1.1', '11.4.1.1'],
  '4.1.2': ['9.4.1.2', '11.4.1.2'],
  '4.1.3': ['9.4.1.3', '11.4.1.3'],
  // 2.2 additions
  '2.4.11': ['9.2.4.11', '11.2.4.11'],
  '2.4.12': ['9.2.4.12', '11.2.4.12'],
  '2.5.7': ['9.2.5.7', '11.2.5.7'],
  '2.5.8': ['9.2.5.8', '11.2.5.8'],
  '3.2.6': ['9.3.2.6', '11.3.2.6'],
  '3.3.7': ['9.3.3.7', '11.3.3.7'],
  '3.3.8': ['9.3.3.8', '11.3.3.8'],
};

// Section 508 mapping (US federal standard)
const SECTION508_MAPPING: Record<string, string[]> = {
  '1.1.1': ['508.1.1.1', '508.4.1.1'],
  '1.2.1': ['508.1.2.1', '508.4.2.1'],
  '1.2.2': ['508.1.2.2', '508.4.2.2'],
  '1.2.3': ['508.1.2.3', '508.4.2.3'],
  '1.2.4': ['508.1.2.4', '508.4.2.4'],
  '1.2.5': ['508.1.2.5', '508.4.2.5'],
  '1.3.1': ['508.1.3.1', '508.4.3.1'],
  '1.3.2': ['508.1.3.2', '508.4.3.2'],
  '1.3.3': ['508.1.3.3', '508.4.3.3'],
  '1.4.1': ['508.1.4.1', '508.4.4.1'],
  '1.4.2': ['508.1.4.2', '508.4.4.2'],
  '1.4.3': ['508.1.4.3', '508.4.4.3'],
  '1.4.4': ['508.1.4.4', '508.4.4.4'],
  '1.4.5': ['508.1.4.5', '508.4.4.5'],
  '2.1.1': ['508.2.1.1', '508.4.5.1'],
  '2.1.2': ['508.2.1.2', '508.4.5.2'],
  '2.1.4': ['508.2.1.4', '508.4.5.4'],
  '2.2.1': ['508.2.2.1', '508.4.5.5'],
  '2.2.2': ['508.2.2.2', '508.4.5.6'],
  '2.3.1': ['508.2.3.1', '508.4.5.7'],
  '2.4.1': ['508.2.4.1', '508.4.6.1'],
  '2.4.2': ['508.2.4.2', '508.4.6.2'],
  '2.4.3': ['508.2.4.3', '508.4.6.3'],
  '2.4.4': ['508.2.4.4', '508.4.6.4'],
  '2.4.5': ['508.2.4.5', '508.4.6.5'],
  '2.4.6': ['508.2.4.6', '508.4.6.6'],
  '2.4.7': ['508.2.4.7', '508.4.6.7'],
  '3.1.1': ['508.3.1.1', '508.4.7.1'],
  '3.1.2': ['508.3.1.2', '508.4.7.2'],
  '3.2.1': ['508.3.2.1', '508.4.8.1'],
  '3.2.2': ['508.3.2.2', '508.4.8.2'],
  '3.2.3': ['508.3.2.3', '508.4.8.3'],
  '3.2.4': ['508.3.2.4', '508.4.8.4'],
  '3.3.1': ['508.3.3.1', '508.4.9.1'],
  '3.3.2': ['508.3.3.2', '508.4.9.2'],
  '3.3.3': ['508.3.3.3', '508.4.9.3'],
  '3.3.4': ['508.3.3.4', '508.4.9.4'],
  '4.1.1': ['508.4.1.1', '508.4.10.1'],
  '4.1.2': ['508.4.1.2', '508.4.10.2'],
  '4.1.3': ['508.4.1.3', '508.4.10.3'],
  // 2.2 additions
  '2.4.11': ['508.2.4.11', '508.4.6.11'],
  '2.4.12': ['508.2.4.12', '508.4.6.12'],
  '2.5.7': ['508.2.5.7', '508.4.6.13'],
  '2.5.8': ['508.2.5.8', '508.4.6.14'],
  '3.2.6': ['508.3.2.6', '508.4.8.5'],
  '3.3.7': ['508.3.3.7', '508.4.9.5'],
  '3.3.8': ['508.3.3.8', '508.4.9.6'],
};

export interface VPATCriterion {
  id: string;
  level: string;
  name: string;
  conformance: 'supports' | 'partially-supports' | 'does-not-support' | 'not-evaluated';
  remarks: string;
  en301549Refs?: string[];
  section508Refs?: string[];
  manualCheckId?: string;
}

/** Human readable conformance labels. "Not Evaluated" is the only honest label for
 * a criterion that automated testing did not assess - never "Not Applicable". */
export const VPAT_CONFORMANCE_LABELS: Record<VPATCriterion['conformance'], string> = {
  supports: 'Supports',
  'partially-supports': 'Partially Supports',
  'does-not-support': 'Does Not Support',
  'not-evaluated': 'Not Evaluated',
};

interface VPATSummary {
  supports: number;
  partiallySupports: number;
  doesNotSupport: number;
  notEvaluated: number;
}

export interface VPATData {
  criteria: VPATCriterion[];
  summary: VPATSummary;
  meta: {
    generatedAt: string;
    standard: 'WCAG 2.2 AA' | 'WCAG 2.1 AA';
    en301549: boolean;
    section508: boolean;
    projectId: string;
    scanId?: string;
  };
}

function getConformance(violations: Array<{ wcagCriteria: string | null; severity: string }>, criterionId: string): {
  conformance: VPATCriterion['conformance'];
  remarks: string;
  count: number;
} {
  const matching = violations.filter(v => v.wcagCriteria === criterionId);
  
  if (matching.length === 0) {
    return {
      conformance: 'not-evaluated',
      remarks: 'Not evaluated by automated scan. Manual testing required.',
      count: 0,
    };
  }
  
  const hasCritical = matching.some(v => v.severity === 'critical');
  const hasSerious = matching.some(v => v.severity === 'serious');
  const count = matching.length;
  
  if (hasCritical || hasSerious) {
    return {
      conformance: 'does-not-support',
      remarks: `${count} automated violation(s) found (critical/serious). Manual verification recommended.`,
      count,
    };
  }

  // Any unresolved violation means the criterion cannot claim full support.
  return {
    conformance: 'partially-supports',
    remarks: `${count} minor/moderate violation(s) found.`,
    count,
  };
}

export async function generateVPATData(projectId: string, scanId?: string, options?: {
  standard?: 'WCAG 2.2 AA' | 'WCAG 2.1 AA';
  includeEN301549?: boolean;
  includeSection508?: boolean;
}): Promise<VPATData> {
  const standard = options?.standard ?? 'WCAG 2.2 AA';
  const criterionList = standard === 'WCAG 2.2 AA' ? WCAG22_CRITERIA : WCAG22_CRITERIA.filter(c => !['2.4.11','2.4.12','2.5.7','2.5.8','3.2.6','3.3.7','3.3.8'].includes(c.id));
  
  const where = scanId
    ? { scanId }
    : { projectId, status: { not: 'fixed' }, deletedAt: null };

  const violations = await db.violation.findMany({
    where,
    select: { wcagCriteria: true, severity: true },
  });

  // Get manual check results for remarks
  const manualChecks = await db.manualCheck.findMany({
    where: { projectId },
    select: { checkId: true, status: true, notes: true },
  });
  const manualById = new Map(manualChecks.map(m => [m.checkId, m]));

  const vpCriteria: VPATCriterion[] = [];
  let supports = 0;
  let partiallySupports = 0;
  let doesNotSupport = 0;
  let notEvaluated = 0;

  for (const criterion of criterionList) {
    const { conformance, remarks, count } = getConformance(violations, criterion.id);
    
    // Enhance remarks with manual check info
    let enhancedRemarks = remarks;
    const manualCheck = manualById.get(criterion.id);
    if (manualCheck) {
      if (manualCheck.status === 'pass') {
        enhancedRemarks += ` Manual check: PASS - ${manualCheck.notes || 'Verified accessible.'}`;
      } else if (manualCheck.status === 'fail') {
        enhancedRemarks += ` Manual check: FAIL - ${manualCheck.notes || 'Failed manual verification.'}`;
      }
    }

    // Update counts based on final conformance (after manual check override)
    let finalConformance = conformance;
    if (manualCheck?.status === 'fail' && conformance !== 'does-not-support') {
      finalConformance = 'does-not-support';
    } else if (manualCheck?.status === 'pass' && conformance !== 'does-not-support') {
      // A manual pass can clear minor/moderate findings, but never critical or
      // serious ones.
      const hasCriticalOrSerious = violations.some(
        v => v.wcagCriteria === criterion.id && (v.severity === 'critical' || v.severity === 'serious')
      );
      if (!hasCriticalOrSerious) finalConformance = 'supports';
    }

    if (finalConformance === 'supports') supports++;
    else if (finalConformance === 'partially-supports') partiallySupports++;
    else if (finalConformance === 'does-not-support') doesNotSupport++;
    else notEvaluated++;

    const vpCriterion: VPATCriterion = {
      id: criterion.id,
      level: criterion.level,
      name: criterion.name,
      conformance: finalConformance,
      remarks: enhancedRemarks,
    };

    // Add standard references if requested
    if (options?.includeEN301549) {
      vpCriterion.en301549Refs = EN301549_MAPPING[criterion.id] || [];
    }
    if (options?.includeSection508) {
      vpCriterion.section508Refs = SECTION508_MAPPING[criterion.id] || [];
    }
    if (manualCheck) {
      vpCriterion.manualCheckId = manualCheck.checkId;
    }

    vpCriteria.push(vpCriterion);
  }

  return {
    criteria: vpCriteria,
    summary: { supports, partiallySupports, doesNotSupport, notEvaluated },
    meta: {
      generatedAt: new Date().toISOString(),
      standard,
      en301549: !!options?.includeEN301549,
      section508: !!options?.includeSection508,
      projectId,
      scanId,
    },
  };
}