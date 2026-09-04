import { NextRequest, NextResponse } from 'next/server';
import { generateSpMetadata } from '@/lib/saml';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const metadataXml = generateSpMetadata({
    entityId: `${origin}/api/auth/sso/metadata`,
    assertionConsumerServiceUrl: `${origin}/api/auth/sso/callback`,
  });

  return new NextResponse(metadataXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/samlmetadata+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
