import { db } from './db';

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

interface VPATCriterion {
  id: string;
  level: string;
  name: string;
  conformance: 'supports' | 'partially-supports' | 'does-not-support' | 'not-evaluated';
  remarks: string;
}

export async function generateVPATData(projectId: string, scanId?: string): Promise<{
  criteria: VPATCriterion[];
  summary: { supports: number; partiallySupports: number; doesNotSupport: number; notEvaluated: number };
}> {
  const where = scanId
    ? { scanId }
    : { projectId, status: { not: 'fixed' }, deletedAt: null };

  const violations = await db.violation.findMany({
    where,
    select: { wcagCriteria: true, severity: true },
  });

  const criteria: VPATCriterion[] = [];
  let supports = 0;
  let partiallySupports = 0;
  let doesNotSupport = 0;
  let notEvaluated = 0;

  for (const criterion of WCAG_CRITERIA) {
    const matching = violations.filter(v => v.wcagCriteria === criterion.id);

    let conformance: VPATCriterion['conformance'];
    let remarks: string;

    if (matching.length === 0) {
      // Not evaluated by automation — never claim "Not Applicable"
      conformance = 'not-evaluated';
      remarks = 'Not evaluated by automated scan. Manual testing required.';
      notEvaluated++;
    } else {
      const hasCritical = matching.some(v => v.severity === 'critical');
      const hasSerious = matching.some(v => v.severity === 'serious');
      const count = matching.length;

      if (hasCritical || hasSerious) {
        conformance = 'does-not-support';
        remarks = `${count} automated violation(s) found (critical/serious).`;
        doesNotSupport++;
      } else if (count > 2) {
        conformance = 'partially-supports';
        remarks = `${count} minor/moderate violation(s) found.`;
        partiallySupports++;
      } else {
        conformance = 'supports';
        remarks = `${count} minor violation(s) found.`;
        supports++;
      }
    }

    criteria.push({
      id: criterion.id,
      level: criterion.level,
      name: criterion.name,
      conformance,
      remarks,
    });
  }

  return {
    criteria,
    summary: { supports, partiallySupports, doesNotSupport, notEvaluated },
  };
}