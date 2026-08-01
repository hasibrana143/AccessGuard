import { NextResponse } from 'next/server';
import { privacyPolicy } from '@/lib/legal';

export async function GET() {
  return new NextResponse(privacyPolicy, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
