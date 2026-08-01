// Client-safe permission definitions (no server imports).
export const PERMISSIONS = {
  VIEW_PROJECTS: 'view_projects',
  CREATE_PROJECTS: 'create_projects',
  DELETE_PROJECTS: 'delete_projects',
  RUN_SCANS: 'run_scans',
  MANAGE_SCHEDULES: 'manage_schedules',
  MANAGE_VIOLATIONS: 'manage_violations',
  GENERATE_REMEDIATION: 'generate_remediation',
  CREATE_PR: 'create_pr',
  GENERATE_REPORTS: 'generate_reports',
  MANAGE_GITHUB: 'manage_github',
  MANAGE_TEAM: 'manage_team',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_BILLING: 'manage_billing',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  [PERMISSIONS.VIEW_PROJECTS]: { label: 'View projects', description: 'See projects and their scan results' },
  [PERMISSIONS.CREATE_PROJECTS]: { label: 'Create projects', description: 'Add and import new projects' },
  [PERMISSIONS.DELETE_PROJECTS]: { label: 'Delete projects', description: 'Remove projects and their history' },
  [PERMISSIONS.RUN_SCANS]: { label: 'Run scans', description: 'Start accessibility scans' },
  [PERMISSIONS.MANAGE_SCHEDULES]: { label: 'Manage schedules', description: 'Create and edit scheduled scans' },
  [PERMISSIONS.MANAGE_VIOLATIONS]: { label: 'Manage violations', description: 'Update violation statuses (fix, ignore, mark false positive)' },
  [PERMISSIONS.GENERATE_REMEDIATION]: { label: 'Generate AI fixes', description: 'Request AI remediation code' },
  [PERMISSIONS.CREATE_PR]: { label: 'Create pull requests', description: 'Open GitHub PRs with fixes' },
  [PERMISSIONS.GENERATE_REPORTS]: { label: 'Generate reports', description: 'Create WCAG / VPAT / executive reports' },
  [PERMISSIONS.MANAGE_GITHUB]: { label: 'Manage GitHub', description: 'Connect and disconnect GitHub repositories' },
  [PERMISSIONS.MANAGE_TEAM]: { label: 'Manage team', description: 'Invite members and manage roles' },
  [PERMISSIONS.MANAGE_SETTINGS]: { label: 'Manage settings', description: 'Change organization settings and branding' },
  [PERMISSIONS.MANAGE_BILLING]: { label: 'Manage billing', description: 'Change plans and payment details' },
};
