/**
 * Specification Pattern
 * 
 * Encapsulates complex business rules as composable specifications.
 * 
 * Features:
 * - Composable specifications (AND, OR, NOT)
 * - Reusable business rules
 * - Query building
 * - Validation rules
 * 
 * Usage:
 *   import { specifications } from '@/lib/specification';
 *   
 *   // Check if project is active
 *   const isActive = specifications.project.isActive;
 *   if (isActive.isSatisfiedBy(project)) {
 *     // Project is active
 *   }
 *   
 *   // Combine specifications
 *   const canScan = specifications.project.isActive
 *     .and(specifications.project.hasUrl);
 */

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): AndSpecification<T>;
  or(other: Specification<T>): OrSpecification<T>;
  not(): NotSpecification<T>;
  description: string;
}

/**
 * Base specification with composition methods
 */
abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  abstract description: string;

  and(other: Specification<T>): AndSpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): OrSpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): NotSpecification<T> {
    return new NotSpecification(this);
  }
}

/**
 * AND specification
 */
class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  get description(): string {
    return `(${this.left.description} AND ${this.right.description})`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/**
 * OR specification
 */
class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super();
  }

  get description(): string {
    return `(${this.left.description} OR ${this.right.description})`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/**
 * NOT specification
 */
class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private inner: Specification<T>) {
    super();
  }

  get description(): string {
    return `NOT (${this.inner.description})`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}

// ==================== Project Specifications ====================

interface Project {
  id: string;
  name: string;
  url?: string;
  status: 'active' | 'inactive' | 'archived';
  teamId?: string;
  createdAt: Date;
  lastScanAt?: Date;
}

class ProjectIsActive extends BaseSpecification<Project> {
  get description(): string {
    return 'Project is active';
  }

  isSatisfiedBy(project: Project): boolean {
    return project.status === 'active';
  }
}

class ProjectHasUrl extends BaseSpecification<Project> {
  get description(): string {
    return 'Project has URL';
  }

  isSatisfiedBy(project: Project): boolean {
    return !!project.url && project.url.length > 0;
  }
}

class ProjectIsNew extends BaseSpecification<Project> {
  get description(): string {
    return 'Project was created in last 7 days';
  }

  isSatisfiedBy(project: Project): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return project.createdAt > sevenDaysAgo;
  }
}

class ProjectHasRecentScan extends BaseSpecification<Project> {
  private maxAge: number;

  constructor(maxAgeDays: number = 7) {
    super();
    this.maxAge = maxAgeDays;
  }

  get description(): string {
    return `Project has scan in last ${this.maxAge} days`;
  }

  isSatisfiedBy(project: Project): boolean {
    if (!project.lastScanAt) return false;
    const maxAgeDate = new Date();
    maxAgeDate.setDate(maxAgeDate.getDate() - this.maxAge);
    return project.lastScanAt > maxAgeDate;
  }
}

class ProjectBelongsToTeam extends BaseSpecification<Project> {
  constructor(private teamId: string) {
    super();
  }

  get description(): string {
    return `Project belongs to team ${this.teamId}`;
  }

  isSatisfiedBy(project: Project): boolean {
    return project.teamId === this.teamId;
  }
}

// ==================== Scan Specifications ====================

interface Scan {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  violationCount: number;
}

class ScanIsRunning extends BaseSpecification<Scan> {
  get description(): string {
    return 'Scan is running';
  }

  isSatisfiedBy(scan: Scan): boolean {
    return scan.status === 'running';
  }
}

class ScanIsCompleted extends BaseSpecification<Scan> {
  get description(): string {
    return 'Scan is completed';
  }

  isSatisfiedBy(scan: Scan): boolean {
    return scan.status === 'completed';
  }
}

class ScanHasViolations extends BaseSpecification<Scan> {
  get description(): string {
    return 'Scan has violations';
  }

  isSatisfiedBy(scan: Scan): boolean {
    return scan.violationCount > 0;
  }
}

class ScanIsRecent extends BaseSpecification<Scan> {
  private maxAge: number;

  constructor(maxAgeHours: number = 24) {
    super();
    this.maxAge = maxAgeHours;
  }

  get description(): string {
    return `Scan completed in last ${this.maxAge} hours`;
  }

  isSatisfiedBy(scan: Scan): boolean {
    if (!scan.completedAt) return false;
    const maxAgeDate = new Date();
    maxAgeDate.setHours(maxAgeDate.getHours() - this.maxAge);
    return scan.completedAt > maxAgeDate;
  }
}

// ==================== Violation Specifications ====================

interface Violation {
  id: string;
  scanId: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  status: 'open' | 'fixed' | 'ignored' | 'false_positive';
  wcagRule: string;
  confidence: number;
}

class ViolationIsOpen extends BaseSpecification<Violation> {
  get description(): string {
    return 'Violation is open';
  }

  isSatisfiedBy(violation: Violation): boolean {
    return violation.status === 'open';
  }
}

class ViolationIsCritical extends BaseSpecification<Violation> {
  get description(): string {
    return 'Violation is critical';
  }

  isSatisfiedBy(violation: Violation): boolean {
    return violation.severity === 'critical';
  }
}

class ViolationIsHighConfidence extends BaseSpecification<Violation> {
  private threshold: number;

  constructor(threshold: number = 0.8) {
    super();
    this.threshold = threshold;
  }

  get description(): string {
    return `Violation confidence >= ${this.threshold}`;
  }

  isSatisfiedBy(violation: Violation): boolean {
    return violation.confidence >= this.threshold;
  }
}

// ==================== Specifications Collection ====================

export const specifications = {
  project: {
    isActive: new ProjectIsActive(),
    hasUrl: new ProjectHasUrl(),
    isNew: new ProjectIsNew(),
    hasRecentScan: new ProjectHasRecentScan(),
    belongsToTeam: (teamId: string) => new ProjectBelongsToTeam(teamId),
    
    // Composed specifications
    canScan: new ProjectIsActive().and(new ProjectHasUrl()),
    needsAttention: new ProjectIsActive().and(new ProjectHasRecentScan().not()),
  },
  scan: {
    isRunning: new ScanIsRunning(),
    isCompleted: new ScanIsCompleted(),
    hasViolations: new ScanHasViolations(),
    isRecent: new ScanIsRecent(),
    
    // Composed specifications
    hasRecentViolations: new ScanIsCompleted().and(new ScanHasViolations()),
  },
  violation: {
    isOpen: new ViolationIsOpen(),
    isCritical: new ViolationIsCritical(),
    isHighConfidence: new ViolationIsHighConfidence(),
    
    // Composed specifications
    needsImmediateAttention: new ViolationIsOpen().and(new ViolationIsCritical()),
  },
};

/**
 * Specification filter helper
 */
export function filterBySpecification<T>(
  items: T[],
  spec: Specification<T>
): T[] {
  return items.filter(item => spec.isSatisfiedBy(item));
}

/**
 * Count items matching specification
 */
export function countBySpecification<T>(
  items: T[],
  spec: Specification<T>
): number {
  return items.filter(item => spec.isSatisfiedBy(item)).length;
}
