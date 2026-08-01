import { NextResponse } from 'next/server';
import { termsOfService } from '@/lib/legal';

export async function GET() {
  return new NextResponse(termsOfService, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
