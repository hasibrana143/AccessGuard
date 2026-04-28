// AccessGuard Email Types

export type EmailTemplateType = 
  | 'welcome'
  | 'password-reset'
  | 'scan-complete'
  | 'violation-alert'
  | 'weekly-report'
  | 'team-invite';

export interface EmailSettings {
  notificationsEnabled: boolean;
  alertThreshold: 'critical' | 'serious' | 'moderate' | 'all';
  weeklyReports: boolean;
  weeklyReportDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  notificationEmail?: string; // Custom notification email (defaults to org admin)
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

// Email Template Data Types
export interface WelcomeEmailData {
  email: string;
  name: string;
}

export interface PasswordResetEmailData {
  email: string;
  resetToken: string;
  resetUrl: string;
}

export interface ScanCompleteEmailData {
  email: string;
  projectName: string;
  violationsCount: number;
  scanUrl: string;
  criticalCount?: number;
  seriousCount?: number;
  moderateCount?: number;
  minorCount?: number;
}

export interface ViolationAlertEmailData {
  email: string;
  projectName: string;
  criticalCount: number;
  seriousCount: number;
  projectUrl?: string;
}

export interface WeeklyReportEmailData {
  email: string;
  organizationName: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  summary: {
    totalScans: number;
    totalViolations: number;
    newViolations: number;
    fixedViolations: number;
    criticalCount: number;
    seriousCount: number;
    moderateCount: number;
    minorCount: number;
  };
  projects: Array<{
    name: string;
    url: string;
    violations: number;
    riskScore: number | null;
  }>;
  topIssues: Array<{
    ruleId: string;
    name: string;
    count: number;
  }>;
}

export interface TeamInviteEmailData {
  email: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
  expiresIn: string;
}

// Default email settings
export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  notificationsEnabled: true,
  alertThreshold: 'serious',
  weeklyReports: true,
  weeklyReportDay: 'monday',
};
