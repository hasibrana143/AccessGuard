import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse } from '@/lib/rate-limit';

// Demo credentials
const DEMO_CREDENTIALS = {
  email: 'demo@accessguard.com',
  password: 'demo123'
};

// POST /api/auth/login
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`auth-login:${clientId}`, { interval: 60000, limit: 5 });
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check demo credentials
    if (email.toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { email: DEMO_CREDENTIALS.email },
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

    // Return user data
    return NextResponse.json({
      success: true,
      data: {
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization
        } : {
          id: 'demo-user',
          email: DEMO_CREDENTIALS.email,
          name: 'Demo User',
          role: 'admin',
          organization: { id: 'demo-org', name: 'Demo Organization', slug: 'demo-org', plan: 'professional' }
        },
        token: `demo-token-${Date.now()}`
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
