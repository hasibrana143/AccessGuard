import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/error-logger';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rl = await checkRateLimit(clientId, { interval: 60000, limit: 100 });
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  try {
    let reportPayload: Record<string, unknown> = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/csp-report') || contentType.includes('application/json')) {
      const body = await request.json();
      reportPayload = body['csp-report'] || body;
    } else {
      const text = await request.text();
      try {
        const parsed = JSON.parse(text);
        reportPayload = parsed['csp-report'] || parsed;
      } catch {
        reportPayload = { raw: text.slice(0, 500) };
      }
    }

    const blockedUri = reportPayload['blocked-uri'] || reportPayload.blockedURI;
    const violatedDirective = reportPayload['violated-directive'] || reportPayload.violatedDirective;
    const documentUri = reportPayload['document-uri'] || reportPayload.documentURI;

    logger.warn(
      {
        blockedUri,
        violatedDirective,
        documentUri,
        clientIp: clientId,
      },
      'CSP violation reported'
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to parse CSP report');
    return new NextResponse(null, { status: 400 });
  }
}
