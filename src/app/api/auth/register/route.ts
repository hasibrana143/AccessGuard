import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { sendVerificationEmail, isEmailConfigured } from '@/lib/email';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/register
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`auth-register:${clientId}`, { interval: 60000, limit: 3 });
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Create or get organization
    let organization;
    if (organizationName) {
      // Create a new organization for the user
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      organization = await db.organization.create({
        data: {
          name: organizationName,
          slug: `${slug}-${Date.now()}`,
          plan: 'starter',
          settings: JSON.stringify({ theme: 'system', notifications: true })
        }
      });
    } else {
      // Get default organization
      organization = await db.organization.findFirst({
        where: { slug: 'default-org' }
      });

      if (!organization) {
        organization = await db.organization.create({
          data: {
            name: 'Default Organization',
            slug: 'default-org',
            plan: 'starter',
            settings: JSON.stringify({ theme: 'system', notifications: true })
          }
        });
      }
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    const hashedVerificationToken = hashToken(verificationToken);

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'admin',
        orgId: organization.id,
        emailVerificationToken: hashedVerificationToken
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true
          }
        }
      }
    });

    // Send verification email
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    if (isEmailConfigured()) {
      await sendVerificationEmail(user.email, user.name || 'there', verifyUrl);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization
        },
        token: `token-${user.id}-${Date.now()}`,
        ...(isEmailConfigured() ? {} : { demoVerificationToken: verificationToken })
      }
    });

  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
