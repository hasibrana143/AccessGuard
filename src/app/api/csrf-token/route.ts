import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/csrf-token - Get CSRF token for the current session
// This endpoint returns the CSRF token embedded in the JWT
// The client must include this token in the X-CSRF-Token header for mutation requests
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Return the CSRF token from the JWT payload
    return NextResponse.json({
      success: true,
      data: {
        csrfToken: payload.csrfToken
      }
    });

  } catch (error) {
    console.error('CSRF token error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get CSRF token' },
      { status: 500 }
    );
  }
}
