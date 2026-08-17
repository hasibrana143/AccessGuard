// Email service for AccessGuard using Resend
import { Resend } from 'resend';
import { logger } from '@/lib/error-logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@accessguard.io';

// Escape user-controlled values before interpolating into email HTML.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Check if email is configured
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Send email
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    logger.info({ subject: options.subject, to: options.to }, '[EMAIL DEMO MODE] Would send');
    return { success: true };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (result.error || !result.data) {
      logger.error({ err: result.error, to: options.to }, 'Resend rejected email');
      return { success: false, error: result.error?.message || 'Email rejected' };
    }
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, '');
    return { success: false, error: String(error) };
  }
}

// Welcome email
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Welcome to AccessGuard!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Welcome to AccessGuard!</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for joining AccessGuard! You're now ready to make your websites accessible.</p>
        <p>Get started by adding your first project:</p>
        <ol>
          <li>Go to Projects and click "Add Project"</li>
          <li>Enter your website URL</li>
          <li>We'll scan it for WCAG violations</li>
        </ol>
        <p>If you have any questions, just reply to this email.</p>
        <p>Best,<br>The AccessGuard Team</p>
      </div>
    `,
  });
}

// Password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<void> {
  const fullUrl = `${resetUrl}?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Reset your AccessGuard password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Reset Your Password</h1>
        <p>You requested to reset your password.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${fullUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
        <p style="color: #666; margin-top: 20px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

// Scan complete email
export async function sendScanCompleteEmail(email: string, projectName: string, violationsCount: number, dashboardUrl: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Scan complete: ${projectName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Scan Complete</h1>
        <p>Your scan of <strong>${escapeHtml(projectName)}</strong> has completed.</p>
        <p>Found: <strong style="color: ${violationsCount > 0 ? '#ef4444' : '#22c55e'}">${violationsCount} violations</strong></p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Results</a>
      </div>
    `,
  });
}

// Team invite email
export async function sendTeamInviteEmail(email: string, orgName: string, inviterName: string, acceptUrl: string, role: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You've been invited to ${orgName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Team Invitation</h1>
        <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(orgName)}</strong> as a <strong>${escapeHtml(role)}</strong>.</p>
        <a href="${acceptUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Accept Invitation</a>
        <p style="color: #666;">This invitation expires in 7 days.</p>
      </div>
    `,
  });
}

// Email verification
export async function sendVerificationEmail(email: string, name: string, verifyUrl: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Verify your AccessGuard email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f97316;">Verify Your Email</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for signing up! Please confirm your email address to activate your account.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
        <p style="color: #666; margin-top: 20px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}

// Payment dunning email
export async function sendDunningEmail(email: string, orgName: string, invoiceUrl: string, attemptCount: number, nextRetryDate?: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Payment failed — Action required to keep your AccessGuard subscription active',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ef4444;">Payment Failed</h1>
        <p>Hi there,</p>
        <p>We tried to charge your payment method for <strong>${escapeHtml(orgName)}</strong> but the payment failed (attempt ${attemptCount}).</p>
        <p>To avoid service interruption, please update your payment method:</p>
        <a href="${invoiceUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a>
        ${nextRetryDate ? `<p style="margin-top: 16px; color: #666;">Next retry: ${nextRetryDate}. If payment continues to fail, your subscription may be paused.</p>` : ''}
        <p style="margin-top: 24px; color: #666; font-size: 14px;">If you have questions, reply to this email or contact support.</p>
        <p>Best,<br>The AccessGuard Team</p>
      </div>
    `,
  });
}
