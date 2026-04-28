// AccessGuard Email Templates
// Clean HTML email templates with responsive design and plain text fallback

import type {
  WelcomeEmailData,
  PasswordResetEmailData,
  ScanCompleteEmailData,
  ViolationAlertEmailData,
  WeeklyReportEmailData,
  TeamInviteEmailData,
} from '@/types/email';

// Brand colors and styles
const BRAND_COLOR = '#6366f1'; // Indigo
const BRAND_NAME = 'AccessGuard';
const BRAND_TAGLINE = 'ADA Compliance Made Simple';

// Base email wrapper
function createEmailWrapper(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${previewText}">
  <title>${BRAND_NAME}</title>
  <style>
    /* Reset styles */
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    
    /* Container */
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    
    /* Header */
    .email-header { text-align: center; padding: 30px 0; border-bottom: 1px solid #e5e7eb; }
    .email-header h1 { color: ${BRAND_COLOR}; margin: 0; font-size: 28px; font-weight: 700; }
    .email-header p { color: #6b7280; margin: 5px 0 0; font-size: 14px; }
    
    /* Content */
    .email-content { padding: 30px 0; }
    .email-content h2 { color: #111827; margin: 0 0 20px; font-size: 22px; }
    .email-content p { color: #374151; margin: 0 0 15px; line-height: 1.6; }
    
    /* Button */
    .email-button { display: inline-block; padding: 14px 28px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 10px 0; }
    .email-button:hover { background-color: #4f46e5; }
    
    /* Stats box */
    .stats-box { background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .stat-item { text-align: center; padding: 10px; }
    .stat-value { font-size: 24px; font-weight: 700; color: ${BRAND_COLOR}; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    
    /* Severity badges */
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-critical { background-color: #fef2f2; color: #dc2626; }
    .badge-serious { background-color: #fff7ed; color: #ea580c; }
    .badge-moderate { background-color: #fefce8; color: #ca8a04; }
    .badge-minor { background-color: #f0fdf4; color: #16a34a; }
    
    /* Table */
    .email-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .email-table th, .email-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .email-table th { background-color: #f9fafb; font-weight: 600; color: #374151; }
    
    /* Alert box */
    .alert-box { padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
    .alert-critical { background-color: #fef2f2; border-left: 4px solid #dc2626; }
    .alert-serious { background-color: #fff7ed; border-left: 4px solid #ea580c; }
    .alert-warning { background-color: #fefce8; border-left: 4px solid #ca8a04; }
    
    /* Footer */
    .email-footer { padding: 30px 0; border-top: 1px solid #e5e7eb; text-align: center; }
    .email-footer p { color: #6b7280; font-size: 12px; margin: 5px 0; }
    .email-footer a { color: ${BRAND_COLOR}; text-decoration: none; }
    
    /* Responsive */
    @media only screen and (max-width: 480px) {
      .email-container { padding: 10px; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${BRAND_NAME}</h1>
      <p>${BRAND_TAGLINE}</p>
    </div>
    ${content}
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
      <p><a href="https://accessguard.com">accessguard.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Welcome Email
export function getWelcomeEmailTemplate(data: WelcomeEmailData): { html: string; text: string } {
  const content = `
    <div class="email-content">
      <h2>Welcome to AccessGuard, ${data.name}!</h2>
      <p>Thank you for joining AccessGuard. We're excited to help you make your websites accessible to everyone.</p>
      <p>With AccessGuard, you can:</p>
      <ul style="color: #374151; line-height: 1.8;">
        <li>Scan your websites for ADA and WCAG compliance issues</li>
        <li>Get AI-powered remediation suggestions</li>
        <li>Track your compliance progress over time</li>
        <li>Generate compliance reports for stakeholders</li>
      </ul>
      <p>Ready to get started? Create your first project and run your first accessibility scan.</p>
      <a href="https://accessguard.com/dashboard" class="email-button">Go to Dashboard</a>
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
    </div>`;

  const text = `Welcome to AccessGuard, ${data.name}!

Thank you for joining AccessGuard. We're excited to help you make your websites accessible to everyone.

With AccessGuard, you can:
- Scan your websites for ADA and WCAG compliance issues
- Get AI-powered remediation suggestions
- Track your compliance progress over time
- Generate compliance reports for stakeholders

Ready to get started? Create your first project and run your first accessibility scan.

Visit: https://accessguard.com/dashboard

If you have any questions, feel free to reach out to our support team.

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, `Welcome to AccessGuard, ${data.name}!`),
    text,
  };
}

// Password Reset Email
export function getPasswordResetEmailTemplate(data: PasswordResetEmailData): { html: string; text: string } {
  const content = `
    <div class="email-content">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your password for your AccessGuard account.</p>
      <p>Click the button below to create a new password:</p>
      <a href="${data.resetUrl}" class="email-button">Reset Password</a>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This link will expire in 1 hour for security reasons.</p>
      <div class="alert-box alert-warning">
        <p style="margin: 0; color: #92400e;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${data.resetUrl}</p>
    </div>`;

  const text = `Reset Your Password

We received a request to reset your password for your AccessGuard account.

Click the link below to create a new password:
${data.resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, 'Reset your AccessGuard password'),
    text,
  };
}

// Scan Complete Email
export function getScanCompleteEmailTemplate(data: ScanCompleteEmailData): { html: string; text: string } {
  const severityBreakdown = data.criticalCount !== undefined ? `
    <div class="stats-box">
      <h3 style="margin: 0 0 15px; color: #374151; font-size: 16px;">Violation Breakdown</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value" style="color: #dc2626;">${data.criticalCount || 0}</div>
          <div class="stat-label">Critical</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ea580c;">${data.seriousCount || 0}</div>
          <div class="stat-label">Serious</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ca8a04;">${data.moderateCount || 0}</div>
          <div class="stat-label">Moderate</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #16a34a;">${data.minorCount || 0}</div>
          <div class="stat-label">Minor</div>
        </div>
      </div>
    </div>` : '';

  const alertClass = data.violationsCount > 10 ? 'alert-critical' : data.violationsCount > 5 ? 'alert-serious' : 'alert-warning';
  const alertMessage = data.violationsCount > 10 
    ? 'Your site has a significant number of accessibility issues that need attention.'
    : data.violationsCount > 5 
    ? 'Your site has several accessibility issues that should be addressed.'
    : 'Your site has some accessibility issues to review.';

  const content = `
    <div class="email-content">
      <h2>Scan Complete: ${data.projectName}</h2>
      <p>Your accessibility scan has finished. Here's a summary of the results:</p>
      <div class="stats-box">
        <div class="stat-item">
          <div class="stat-value">${data.violationsCount}</div>
          <div class="stat-label">Total Violations Found</div>
        </div>
      </div>
      ${severityBreakdown}
      <div class="alert-box ${alertClass}">
        <p style="margin: 0;">${alertMessage}</p>
      </div>
      <p>Review your violations and get AI-powered remediation suggestions in your dashboard.</p>
      <a href="${data.scanUrl}" class="email-button">View Results</a>
    </div>`;

  const text = `Scan Complete: ${data.projectName}

Your accessibility scan has finished.

Total Violations Found: ${data.violationsCount}
${data.criticalCount !== undefined ? `
Breakdown:
- Critical: ${data.criticalCount}
- Serious: ${data.seriousCount}
- Moderate: ${data.moderateCount}
- Minor: ${data.minorCount}` : ''}

Review your violations and get AI-powered remediation suggestions in your dashboard.

View Results: ${data.scanUrl}

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, `Scan complete for ${data.projectName}`),
    text,
  };
}

// Violation Alert Email
export function getViolationAlertEmailTemplate(data: ViolationAlertEmailData): { html: string; text: string } {
  const hasCritical = data.criticalCount > 0;
  const hasSerious = data.seriousCount > 0;

  const content = `
    <div class="email-content">
      <h2>⚠️ Accessibility Alert: ${data.projectName}</h2>
      <p>We've detected accessibility issues that require your immediate attention.</p>
      <div class="stats-box">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value" style="color: #dc2626;">${data.criticalCount}</div>
            <div class="stat-label">Critical Issues</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #ea580c;">${data.seriousCount}</div>
            <div class="stat-label">Serious Issues</div>
          </div>
        </div>
      </div>
      ${hasCritical ? `
      <div class="alert-box alert-critical">
        <p style="margin: 0; font-weight: 600; color: #dc2626;">Critical issues can prevent users with disabilities from accessing your content entirely.</p>
      </div>` : ''}
      ${hasSerious ? `
      <div class="alert-box alert-serious">
        <p style="margin: 0; font-weight: 600; color: #ea580c;">Serious issues significantly impact the user experience for people with disabilities.</p>
      </div>` : ''}
      <p>Address these issues promptly to ensure your website remains accessible and compliant with ADA and WCAG guidelines.</p>
      ${data.projectUrl ? `<a href="${data.projectUrl}" class="email-button">View Issues</a>` : ''}
    </div>`;

  const text = `Accessibility Alert: ${data.projectName}

We've detected accessibility issues that require your immediate attention.

Critical Issues: ${data.criticalCount}
Serious Issues: ${data.seriousCount}

${hasCritical ? 'Critical issues can prevent users with disabilities from accessing your content entirely.' : ''}
${hasSerious ? 'Serious issues significantly impact the user experience for people with disabilities.' : ''}

Address these issues promptly to ensure your website remains accessible and compliant with ADA and WCAG guidelines.

${data.projectUrl ? `View Issues: ${data.projectUrl}` : ''}

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, `Alert: ${data.criticalCount + data.seriousCount} issues found in ${data.projectName}`),
    text,
  };
}

// Weekly Report Email
export function getWeeklyReportEmailTemplate(data: WeeklyReportEmailData): { html: string; text: string } {
  const topIssuesHtml = data.topIssues.slice(0, 5).map(issue => `
    <tr>
      <td style="font-weight: 500;">${issue.name}</td>
      <td><span class="badge badge-serious">${issue.count}</span></td>
    </tr>
  `).join('');

  const projectsHtml = data.projects.slice(0, 5).map(project => `
    <tr>
      <td style="font-weight: 500;">${project.name}</td>
      <td><span class="badge ${project.violations > 10 ? 'badge-critical' : project.violations > 5 ? 'badge-serious' : 'badge-minor'}">${project.violations}</span></td>
      <td>${project.riskScore !== null ? `${project.riskScore}/100` : 'N/A'}</td>
    </tr>
  `).join('');

  const content = `
    <div class="email-content">
      <h2>Weekly Accessibility Report</h2>
      <p style="color: #6b7280;">${data.organizationName} • ${data.reportPeriod.start} to ${data.reportPeriod.end}</p>
      
      <h3 style="color: #374151; margin-top: 30px;">Summary</h3>
      <div class="stats-box">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${data.summary.totalScans}</div>
            <div class="stat-label">Scans Run</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.summary.totalViolations}</div>
            <div class="stat-label">Total Issues</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #dc2626;">${data.summary.newViolations}</div>
            <div class="stat-label">New Issues</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #16a34a;">${data.summary.fixedViolations}</div>
            <div class="stat-label">Fixed</div>
          </div>
        </div>
      </div>

      <h3 style="color: #374151; margin-top: 30px;">Severity Breakdown</h3>
      <div class="stats-box">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value" style="color: #dc2626;">${data.summary.criticalCount}</div>
            <div class="stat-label">Critical</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #ea580c;">${data.summary.seriousCount}</div>
            <div class="stat-label">Serious</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #ca8a04;">${data.summary.moderateCount}</div>
            <div class="stat-label">Moderate</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #16a34a;">${data.summary.minorCount}</div>
            <div class="stat-label">Minor</div>
          </div>
        </div>
      </div>

      ${data.projects.length > 0 ? `
      <h3 style="color: #374151; margin-top: 30px;">Projects Overview</h3>
      <table class="email-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Issues</th>
            <th>Risk Score</th>
          </tr>
        </thead>
        <tbody>
          ${projectsHtml}
        </tbody>
      </table>` : ''}

      ${data.topIssues.length > 0 ? `
      <h3 style="color: #374151; margin-top: 30px;">Top Issues</h3>
      <table class="email-table">
        <thead>
          <tr>
            <th>Issue</th>
            <th>Occurrences</th>
          </tr>
        </thead>
        <tbody>
          ${topIssuesHtml}
        </tbody>
      </table>` : ''}

      <p style="margin-top: 30px;">
        <a href="https://accessguard.com/dashboard" class="email-button">View Full Report</a>
      </p>
    </div>`;

  const text = `Weekly Accessibility Report
${data.organizationName} • ${data.reportPeriod.start} to ${data.reportPeriod.end}

Summary:
- Scans Run: ${data.summary.totalScans}
- Total Issues: ${data.summary.totalViolations}
- New Issues: ${data.summary.newViolations}
- Fixed: ${data.summary.fixedViolations}

Severity Breakdown:
- Critical: ${data.summary.criticalCount}
- Serious: ${data.summary.seriousCount}
- Moderate: ${data.summary.moderateCount}
- Minor: ${data.summary.minorCount}

${data.projects.length > 0 ? `Projects:
${data.projects.slice(0, 5).map(p => `- ${p.name}: ${p.violations} issues, Risk: ${p.riskScore !== null ? `${p.riskScore}/100` : 'N/A'}`).join('\n')}` : ''}

${data.topIssues.length > 0 ? `Top Issues:
${data.topIssues.slice(0, 5).map(i => `- ${i.name}: ${i.count} occurrences`).join('\n')}` : ''}

View Full Report: https://accessguard.com/dashboard

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, `Weekly report for ${data.organizationName}`),
    text,
  };
}

// Team Invite Email
export function getTeamInviteEmailTemplate(data: TeamInviteEmailData): { html: string; text: string } {
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  };
  
  const roleDescriptions: Record<string, string> = {
    admin: 'Full access to all features, can manage team members and billing.',
    member: 'Can create and edit projects, run scans, and view reports.',
    viewer: 'Read-only access to projects, scans, and reports.',
  };

  const content = `
    <div class="email-content">
      <h2>You've been invited to join ${data.organizationName}</h2>
      <p><strong>${data.inviterName}</strong> has invited you to join their team on AccessGuard as a <strong>${roleLabels[data.role] || data.role}</strong>.</p>
      
      <div class="stats-box" style="margin: 20px 0;">
        <p style="margin: 0 0 10px; font-weight: 600; color: #374151;">Role: ${roleLabels[data.role] || data.role}</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${roleDescriptions[data.role] || 'Access to AccessGuard features.'}</p>
      </div>
      
      <p>AccessGuard helps teams ensure their websites are ADA and WCAG compliant with automated scanning and AI-powered remediation suggestions.</p>
      
      <a href="${data.inviteUrl}" class="email-button">Accept Invitation</a>
      
      <div class="alert-box alert-warning" style="margin-top: 20px;">
        <p style="margin: 0; color: #92400e;">This invitation will expire in ${data.expiresIn}.</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${data.inviteUrl}</p>
    </div>`;

  const text = `You've been invited to join ${data.organizationName}

${data.inviterName} has invited you to join their team on AccessGuard as a ${roleLabels[data.role] || data.role}.

Role: ${roleLabels[data.role] || data.role}
${roleDescriptions[data.role] || 'Access to AccessGuard features.'}

AccessGuard helps teams ensure their websites are ADA and WCAG compliant with automated scanning and AI-powered remediation suggestions.

Accept your invitation: ${data.inviteUrl}

This invitation will expire in ${data.expiresIn}.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} AccessGuard. All rights reserved.`;

  return {
    html: createEmailWrapper(content, `You've been invited to join ${data.organizationName}`),
    text,
  };
}
