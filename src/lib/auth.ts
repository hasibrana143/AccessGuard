import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '@/lib/db';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  orgId: string;
  orgSlug: string | null;
  orgName: string | null;
  emailVerified: boolean;
}

  if (!process.env.NEXTAUTH_SECRET && !process.env.JWT_SECRET) {
    throw new Error(
      'NEXTAUTH_SECRET is not set. Run: openssl rand -hex 64\n' +
      'Set NEXTAUTH_SECRET in your .env file for production.'
    );
  }
  const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';

export const authOptions: NextAuthOptions = {
  secret: JWT_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // MFA check
        if (user.mfaEnabledAt) {
          const { verifyMfaCode, readMfaSecret } = await import('@/lib/mfa');
          const code = credentials.mfaCode as string | undefined;
          if (!code || !verifyMfaCode(readMfaSecret(user.mfaSecret) || '', code)) {
            throw new Error('MFA_REQUIRED');
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          orgSlug: user.organization.slug,
          orgName: user.organization.name,
          emailVerified: !!user.emailVerifiedAt,
        };
      },
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    // Provision app accounts for OAuth (Google/GitHub) sign-ins.
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;
      if (!user.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email } });
      if (existing) return true;
      const defaultOrg = await db.organization.upsert({
        where: { slug: 'default-org' },
        update: {},
        create: { name: 'Default Organization', slug: 'default-org', plan: 'starter' },
      });
      await db.user.create({
        data: {
          email: user.email,
          name: user.name,
          orgId: defaultOrg.id,
          role: 'member',
          emailVerifiedAt: new Date(),
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // Credentials sign-in carries the full SessionUser payload.
        const sessionUser = user as SessionUser;
        if (sessionUser.orgId) {
          token.id = sessionUser.id;
          token.role = sessionUser.role;
          token.orgId = sessionUser.orgId;
          token.orgSlug = sessionUser.orgSlug;
          token.orgName = sessionUser.orgName;
          token.emailVerified = sessionUser.emailVerified;
        } else if (user.email) {
          // OAuth sign-in: user object is the provider profile (no org/role).
          // Load the provisioned app user so token claims match the DB identity.
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            include: { organization: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.orgId = dbUser.orgId;
            token.orgSlug = dbUser.organization?.slug ?? null;
            token.orgName = dbUser.organization?.name ?? null;
            token.emailVerified = !!dbUser.emailVerifiedAt;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? 'member') as string;
        session.user.orgId = token.orgId as string;
        session.user.orgSlug = token.orgSlug as string | null;
        session.user.orgName = token.orgName as string | null;
        session.user.emailVerified = (token.emailVerified ?? false) as boolean;
      }
      return session;
    },
  },
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

const JWT_EXPIRES_IN = '7d';

export function signToken(payload: { userId: string; email: string; orgId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as { userId: string; email: string; orgId: string; csrfToken?: string };
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function signTokenWithCsrf(payload: { userId: string; email: string; orgId: string }) {
  const csrfToken = generateCsrfToken();
  const token = jwt.sign({ ...payload, csrfToken }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, csrfToken };
}
