import { NextResponse } from 'next/server';

// POST /api/auth/logout - Logout (client-side token removal)
export async function POST() {
  return NextResponse.json({ success: true });
}
