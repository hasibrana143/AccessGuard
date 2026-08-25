import { logger } from './error-logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

type TemplateRenderer = (data: Record<string, unknown>) => EmailTemplate;

// Base email wrapper
function wrapEmail(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${previewText ? `<meta name="description" content="${previewText}">` : ''}
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
    .logo { height: 40px; }
    .content { padding: 20px 0; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 12px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #e74c3c; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .button:hover { background-color: #c0392b; }
    .stats { display: flex; justify-content: space-around; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #e74c3c; }
    .stat-label { font-size: 12px; color: #666; }
    .severity-critical { color: #dc3545; }
    .severity-serious { color: #fd7e14; }
    .severity-moderate { color: #ffc107; }
    .severity-minor { color: #0d6efd; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; color: #e74c3c;">🛡️ AccessGuard</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} AccessGuard. All rights reserved.</p>
    <p>You're receiving this because you have an AccessGuard account.</p>
  </div>
</body>
</html>
  `.trim();
}

// Template renderers
const templates: Record<string, TemplateRenderer> = {
  'welcome': (data) => ({
    subject: `Welcome to AccessGuard, ${data.name || 'there'}!`,
    html: wrapEmail(`
      <h2>Welcome to AccessGuard! 🎉</h2>
      <p>Hi ${data.name || 'there'},</p>
      <p>Welcome to AccessGuard! We're excited to help you improve your website's accessibility.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Add your first website to scan</li>
        <li>Run an accessibility scan</li>
        <li>Review and fix violations</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || 'https://app.accessguard.dev/dashboard'}" class="button">Go to Dashboard</a>
      </p>
      <p>If you have any questions, just reply to this email!</p>
    `),
    text: `Welcome to AccessGuard! Hi ${data.name || 'there'}, Welcome to AccessGuard! Go to dashboard: ${data.dashboardUrl || 'https://app.accessguard.dev/dashboard'}`,
  }),

  'email-verification': (data) => ({
    subject: 'Verify your email address',
    html: wrapEmail(`
      <h2>Verify Your Email</h2>
      <p>Hi ${data.name || 'there'},</p>
      <p>Please click the button below to verify your email address:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.verificationUrl}" class="button">Verify Email</a>
      </p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `),
    text: `Verify your email: ${data.verificationUrl}`,
  }),

  'password-reset': (data) => ({
    subject: 'Reset your password',
    html: wrapEmail(`
      <h2>Password Reset</h2>
      <p>Hi ${data.name || 'there'},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
    text: `Reset your password: ${data.resetUrl}`,
  }),

  'scan-complete': (data) => ({
    subject: `Scan Complete: ${data.projectName} - ${data.violationsFound} violations found`,
    html: wrapEmail(`
      <h2>Scan Complete ✅</h2>
      <p>Hi,</p>
      <p>The scan for <strong>${data.projectName}</strong> has completed.</p>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.pagesScanned || 0}</div>
          <div class="stat-label">Pages Scanned</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.violationsFound || 0}</div>
          <div class="stat-label">Violations Found</div>
        </div>
      </div>
      ${data.severityCounts ? `
      <div style="margin: 20px 0;">
        <p><strong>Violation Breakdown:</strong></p>
        <ul>
          <li><span class="severity-critical">Critical:</span> ${(data.severityCounts as Record<string, number>).critical || 0}</li>
          <li><span class="severity-serious">Serious:</span> ${(data.severityCounts as Record<string, number>).serious || 0}</li>
          <li><span class="severity-moderate">Moderate:</span> ${(data.severityCounts as Record<string, number>).moderate || 0}</li>
          <li><span class="severity-minor">Minor:</span> ${(data.severityCounts as Record<string, number>).minor || 0}</li>
        </ul>
      </div>
      ` : ''}
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || 'https://app.accessguard.dev/dashboard'}" class="button">View Results</a>
      </p>
    `),
    text: `Scan Complete for ${data.projectName}: ${data.violationsFound} violations found`,
  }),

  'weekly-digest': (data) => ({
    subject: `Weekly Digest: ${data.projectName}`,
    html: wrapEmail(`
      <h2>Weekly Digest 📊</h2>
      <p>Hi,</p>
      <p>Here's your weekly accessibility report for <strong>${data.projectName}</strong>:</p>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.totalViolations || 0}</div>
          <div class="stat-label">Total Violations</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.fixedViolations || 0}</div>
          <div class="stat-label">Fixed This Week</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.complianceScore || 0}%</div>
          <div class="stat-label">Compliance Score</div>
        </div>
      </div>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || 'https://app.accessguard.dev/dashboard'}" class="button">View Dashboard</a>
      </p>
    `),
    text: `Weekly Digest for ${data.projectName}: ${data.totalViolations} violations, ${data.fixedViolations} fixed`,
  }),

  'team-invite': (data) => ({
    subject: `You've been invited to join ${data.orgName || 'AccessGuard'}`,
    html: wrapEmail(`
      <h2>Team Invitation 🤝</h2>
      <p>Hi ${data.email},</p>
      <p><strong>${data.invitedBy || 'Someone'}</strong> has invited you to join <strong>${data.orgName || 'AccessGuard'}</strong>.</p>
      <p>Click the button below to accept the invitation:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
      </p>
      <p>This invitation will expire in 7 days.</p>
    `),
    text: `You've been invited to join ${data.orgName || 'AccessGuard'}: ${data.inviteUrl}`,
  }),
};

// Render a template
export function renderEmailTemplate(templateName: string, data: Record<string, unknown>): EmailTemplate | null {
  const renderer = templates[templateName];
  if (!renderer) {
    logger.error({ templateName }, 'Email template not found');
    return null;
  }

  try {
    return renderer(data);
  } catch (err) {
    logger.error({ err, templateName }, 'Failed to render email template');
    return null;
  }
}

// Get available templates
export function getAvailableTemplates(): string[] {
  return Object.keys(templates);
}

// Register a custom template
export function registerTemplate(name: string, renderer: TemplateRenderer): void {
  templates[name] = renderer;
}
