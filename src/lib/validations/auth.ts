import { z } from 'zod';

// Password strength validation helper
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must be less than 100 characters');

// Validate password strength
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 100) {
    return { valid: false, message: 'Password must be less than 100 characters' };
  }
  return { valid: true };
}

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(email => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Register schema
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(email => email.toLowerCase().trim()),
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  organizationName: z
    .string()
    .max(100, 'Organization name must be less than 100 characters')
    .optional()
    .transform(val => val?.trim()),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform(email => email.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
