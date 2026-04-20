import { NextResponse } from 'next/server';

// GET /api/auth/me - Check current session
export async function GET() {
  // In production, verify JWT token or session
  // For demo, we'll return not authenticated
  return NextResponse.json({
    success: false,
    error: 'Not authenticated'
  }, { status: 401 });
}
