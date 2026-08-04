import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';

// POST /api/projects/verify - Generate verification token
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`verify-post:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({
      where: { id: access.project.id }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate verification token
    const verificationToken = `accessguard-verify-${randomBytes(16).toString('hex')}`;

    // Update project with verification token
    await db.project.update({
      where: { id: access.project.id },
      data: { verificationToken }
    });

    const hostname = new URL(project.url).hostname;

    return NextResponse.json({
      success: true,
      data: {
        verificationToken,
        instructions: {
          method: 'meta-tag',
          html: `<meta name="accessguard-verification" content="${verificationToken}">`,
          location: 'Add this meta tag to your homepage <head> section',
          domain: hostname
        },
        alternativeMethods: [
          {
            method: 'dns-txt',
            instruction: `Add a TXT record: accessguard-verification=${verificationToken}`,
          },
          {
            method: 'file',
            instruction: `Create file at /.well-known/accessguard-verification.txt with content: ${verificationToken}`,
          }
        ]
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to generate verification token' },
      { status: 500 }
    );
  }
}

// GET /api/projects/verify - Check verification status
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`verify-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({
      where: { id: access.project.id },
      select: {
        id: true,
        url: true,
        verificationToken: true,
        isVerified: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.isVerified) {
      return NextResponse.json({
        success: true,
        data: { verified: true }
      });
    }

    if (!project.verificationToken) {
      return NextResponse.json({
        success: true,
        data: { verified: false, needsToken: true }
      });
    }

    // Try to verify by checking the website
    try {
      const { validateTargetUrl } = await import('@/lib/url-validation');
      let targetUrl: string | null = project.url;
      let response: Response | null = null;

      // Follow up to 3 redirects, re-validating each hop against private targets
      for (let hop = 0; hop <= 3; hop++) {
        if (!targetUrl) break;
        const hopCheck = await validateTargetUrl(targetUrl);
        if (!hopCheck.ok) {
          throw new Error(`Blocked verification target: ${hopCheck.error}`);
        }
        const hopResponse = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AccessGuard-Verification/1.0)',
          },
          redirect: 'manual',
          signal: AbortSignal.timeout(10000),
        });
        if (hopResponse.status >= 300 && hopResponse.status < 400) {
          const location = hopResponse.headers.get('location');
          if (!location) break;
          targetUrl = new URL(location, targetUrl).toString();
          continue;
        }
        response = hopResponse;
        break;
      }

      if (response?.ok) {
        // Cap the response size (500 KB) to avoid memory spikes
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > 500_000) {
          throw new Error('Response too large to verify');
        }
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > 500_000) {
              await reader.cancel();
              throw new Error('Response too large to verify');
            }
            chunks.push(value);
          }
        }
        const html = new TextDecoder().decode(Buffer.concat(chunks as Uint8Array[]));
        
        // Check for meta tag
        const metaTagMatch = html.match(/<meta\s+name="accessguard-verification"\s+content="([^"]+)"/i);
        
        if (metaTagMatch && metaTagMatch[1] === project.verificationToken) {
          // Verification successful!
          await db.project.update({
            where: { id: access.project.id },
            data: { isVerified: true }
          });

          return NextResponse.json({
            success: true,
            data: { verified: true, message: 'Domain verified successfully!' }
          });
        }
      }
    } catch (fetchError) {
      logger.info({ err: fetchError }, 'Verification check failed');
    }

    return NextResponse.json({
      success: true,
      data: { 
        verified: false, 
        verificationToken: project.verificationToken,
        message: 'Verification token not found on website. Please add the meta tag to your homepage.' 
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}
