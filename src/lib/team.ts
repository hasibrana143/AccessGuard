// Team management utilities for AccessGuard
import crypto from 'crypto';

export type Role = 'admin' | 'member' | 'viewer';

export interface RolePermissions {
  canManageTeam: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canRunScans: boolean;
  canManageIntegrations: boolean;
  canViewReports: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  admin: {
    canManageTeam: true,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canRunScans: true,
    canManageIntegrations: true,
    canViewReports: true,
  },
  member: {
    canManageTeam: false,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canRunScans: true,
    canManageIntegrations: false,
    canViewReports: true,
  },
  viewer: {
    canManageTeam: false,
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canRunScans: false,
    canManageIntegrations: false,
    canViewReports: true,
  },
};

export function getRolePermissions(role: Role): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

export function hasPermission(role: Role, permission: keyof RolePermissions): boolean {
  return getRolePermissions(role)[permission];
}

// Team size limits by plan
export const TEAM_SIZE_LIMITS: Record<string, number> = {
  starter: 2,
  agency: 5,
  enterprise: Infinity,
};

// Generate invite token
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate invite expiry (7 days)
export function getInviteExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}
