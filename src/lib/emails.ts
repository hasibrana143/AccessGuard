// Email Service using Resend
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface ScanCompleteEmailData {
  userName: string;
  projectName: string;
  projectUrl: string;
  violationsFound: number;
  criticalCount: number;
  seriousCount: number;
  riskScore: number;
  scanUrl: string;
}

interface WelcomeEmailData {
  userName: string;
  organizationName: string;
  loginUrl: string;
}

interface PaymentFailedEmailData {
  userName: string;
  organizationName: string;
  amount: string;
  updatePaymentUrl: string;
}

// Send email using Resend
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  if (!resend) {
    console.log('Email not sent - Resend not configured');
    return { success: false, error: 'Resend not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'AccessGuard <noreply@accessguard.io>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

// Scan complete email
export async function sendScanCompleteEmail(data: ScanCompleteEmailData) {
  const { userName, projectName, projectUrl, violationsFound, criticalCount, seriousCount, riskScore, scanUrl } = data;

  const severityColor = riskScore >= 80 ? '#10b981' : riskScore >= 60 ? '#eab308' : '#ef4444';
  const severityLabel = riskScore >= 80 ? 'Low Risk' : riskScore >= 60 ? 'Medium Risk' : 'High Risk';

  return sendEmail({
    to: userName, // In production, use actual email
    subject: `Scan Complete: ${projectName} - ${violationsFound} violations found`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .stat-box { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; text-align: center; }
          .stat-value { font-size: 36px; font-weight: bold; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .severity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .severity-box { padding: 15px; border-radius: 8px; text-align: center; }
          .critical { background: #fef2f2; color: #ef4444; }
          .serious { background: #fff7ed; color: #f97316; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Scan Complete</h1>
            <p style="margin: 0; opacity: 0.9;">Your accessibility audit is ready</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your accessibility scan for <strong>${projectName}</strong> has completed.</p>
            
            <div class="stat-box">
              <div class="stat-value" style="color: ${severityColor}">${riskScore}/100</div>
              <div class="stat-label">${severityLabel}</div>
            </div>
            
            <h3 style="margin-top: 30px;">Violations Found: ${violationsFound}</h3>
            
            <div class="severity-grid">
              <div class="severity-box critical">
                <div class="stat-value">${criticalCount}</div>
                <div class="stat-label">Critical</div>
              </div>
              <div class="severity-box serious">
                <div class="stat-value">${seriousCount}</div>
                <div class="stat-label">Serious</div>
              </div>
            </div>
            
            <p style="margin-top: 20px; text-align: center;">
              <a href="${scanUrl}" class="button">View Full Report</a>
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Scanned URL: <a href="${projectUrl}" style="color: #f97316;">${projectUrl}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>AccessGuard - Making the web accessible, one commit at a time.</p>
            <p>You're receiving this email because you enabled scan notifications.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Welcome email
export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const { userName, organizationName, loginUrl } = data;

  return sendEmail({
    to: userName,
    subject: `Welcome to AccessGuard, ${organizationName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .feature-list { list-style: none; padding: 0; }
          .feature-list li { padding: 10px 0; padding-left: 30px; position: relative; }
          .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ Welcome to AccessGuard</h1>
            <p style="margin: 0; opacity: 0.9;">Your accessibility journey starts now</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Welcome to AccessGuard! Your organization <strong>${organizationName}</strong> is now set up and ready to scan websites for WCAG 2.1 AA compliance.</p>
            
            <h3>Here's what you can do:</h3>
            <ul class="feature-list">
              <li>Add your first website project</li>
              <li>Run accessibility scans with real browser testing</li>
              <li>Get AI-powered remediation suggestions</li>
              <li>Generate Legal Shield™ compliance reports</li>
              <li>Connect GitHub for automated PR creation</li>
            </ul>
            
            <p style="margin-top: 20px; text-align: center;">
              <a href="${loginUrl}" class="button">Go to Dashboard</a>
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Need help? Check out our <a href="#" style="color: #f97316;">documentation</a> or reply to this email.
            </p>
          </div>
          
          <div class="footer">
            <p>AccessGuard - Making the web accessible, one commit at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Payment failed email
export async function sendPaymentFailedEmail(data: PaymentFailedEmailData) {
  const { userName, organizationName, amount, updatePaymentUrl } = data;

  return sendEmail({
    to: userName,
    subject: 'Payment Failed - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Failed</h1>
            <p style="margin: 0; opacity: 0.9;">Action required for ${organizationName}</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            
            <div class="warning-box">
              <p style="margin: 0;"><strong>We were unable to process your payment of ${amount}.</strong></p>
              <p style="margin: 10px 0 0 0;">Please update your payment method to avoid service interruption.</p>
            </div>
            
            <p>Your subscription will remain active for 7 days while we retry the payment. After that, your account may be downgraded.</p>
            
            <p style="margin-top: 20px; text-align: center;">
              <a href="${updatePaymentUrl}" class="button">Update Payment Method</a>
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              If you have questions, please contact our support team.
            </p>
          </div>
          
          <div class="footer">
            <p>AccessGuard - Making the web accessible, one commit at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Daily digest email
export async function sendDailyDigestEmail(data: {
  userName: string;
  organizationName: string;
  projects: Array<{
    name: string;
    riskScore: number;
    newViolations: number;
    fixedViolations: number;
  }>;
  dashboardUrl: string;
}) {
  const { userName, organizationName, projects, dashboardUrl } = data;

  return sendEmail({
    to: userName,
    subject: `Daily Digest - ${organizationName} Accessibility Report`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .project-card { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #f97316; }
          .score-good { color: #10b981; }
          .score-medium { color: #eab308; }
          .score-bad { color: #ef4444; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Digest</h1>
            <p style="margin: 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Here's your daily accessibility summary for <strong>${organizationName}</strong>.</p>
            
            ${projects.map(p => `
              <div class="project-card">
                <h4 style="margin: 0 0 10px 0;">${p.name}</h4>
                <div style="display: flex; justify-content: space-between;">
                  <span>Risk Score: <strong class="${p.riskScore >= 80 ? 'score-good' : p.riskScore >= 60 ? 'score-medium' : 'score-bad'}">${p.riskScore}/100</strong></span>
                  <span style="color: #ef4444;">+${p.newViolations} new</span>
                  <span style="color: #10b981;">${p.fixedViolations} fixed</span>
                </div>
              </div>
            `).join('')}
            
            <p style="margin-top: 20px; text-align: center;">
              <a href="${dashboardUrl}" class="button">View Dashboard</a>
            </p>
          </div>
          
          <div class="footer">
            <p>AccessGuard - Making the web accessible, one commit at a time.</p>
            <p><a href="#" style="color: #9ca3af;">Unsubscribe from daily emails</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
