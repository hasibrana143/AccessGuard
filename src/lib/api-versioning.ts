import { NextRequest, NextResponse } from 'next/server';
import { logger } from './error-logger';

interface VersionConfig {
  version: string;
  isDeprecated: boolean;
  sunsetDate?: string;
  minVersion?: string;
}

const API_VERSIONS: Record<string, VersionConfig> = {
  '1.0.0': {
    version: '1.0.0',
    isDeprecated: false,
  },
  '2.0.0': {
    version: '2.0.0',
    isDeprecated: false,
    minVersion: '1.0.0',
  },
};

const CURRENT_VERSION = '1.0.0';
const DEFAULT_VERSION = '1.0.0';

/**
 * Extract API version from request
 */
export function extractVersion(req: NextRequest): string {
  // Check URL path first (e.g., /api/v1/...)
  const pathMatch = req.nextUrl.pathname.match(/^\/api\/v(\d+)/);
  if (pathMatch) {
    return `${pathMatch[1]}.0.0`;
  }

  // Check Accept header
  const acceptHeader = req.headers.get('accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.accessguard\.v(\d+)\+json/);
    if (versionMatch) {
      return `${versionMatch[1]}.0.0`;
    }
  }

  // Check X-API-Version header
  const versionHeader = req.headers.get('x-api-version');
  if (versionHeader) {
    return versionHeader;
  }

  return DEFAULT_VERSION;
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(
  res: NextResponse,
  version: string,
  requestVersion: string
): NextResponse {
  const config = API_VERSIONS[version];

  res.headers.set('X-API-Version', version);
  res.headers.set('X-API-Current-Version', CURRENT_VERSION);

  if (config?.isDeprecated) {
    res.headers.set('X-API-Deprecated', 'true');
    if (config.sunsetDate) {
      res.headers.set('Sunset', config.sunsetDate);
    }
    res.headers.set(
      'Warning',
      `299 - "API version ${version} is deprecated. Please upgrade to ${CURRENT_VERSION}."`
    );
  }

  // Add rate limit headers
  res.headers.set('X-RateLimit-Limit', '100');
  res.headers.set('X-RateLimit-Remaining', '99');
  res.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

  return res;
}

/**
 * Check if requested version is supported
 */
export function isVersionSupported(version: string): boolean {
  return version in API_VERSIONS;
}

/**
 * Check if version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  const config = API_VERSIONS[version];
  return config?.isDeprecated || false;
}

/**
 * Get version info
 */
export function getVersionInfo(version: string): VersionConfig | null {
  return API_VERSIONS[version] || null;
}

/**
 * Version middleware for API routes
 */
export function withVersioning(
  handler: (req: NextRequest, version: string) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const version = extractVersion(req);

    // Log version usage
    logger.info({
      version,
      path: req.nextUrl.pathname,
      method: req.method,
    }, 'API version used');

    // Call handler with version
    const res = await handler(req, version);

    // Add version headers
    return addVersionHeaders(res, CURRENT_VERSION, version);
  };
}

/**
 * Redirect old version to new version
 */
export function redirectToVersion(
  req: NextRequest,
  newVersion: string
): NextResponse {
  const newPath = req.nextUrl.pathname.replace(/^\/api\/v\d+/, `/api/v${newVersion.split('.')[0]}`);
  const url = new URL(newPath, req.url);
  url.search = req.nextUrl.search;

  return NextResponse.redirect(url, 301);
}

/**
 * Get version migration guide
 */
export function getMigrationGuide(fromVersion: string, toVersion: string): string[] {
  const guides: Record<string, string[]> = {
    '1.0.0-2.0.0': [
      'All responses now include pagination metadata',
      'Error responses follow RFC 7807 format',
      'Deprecated fields removed from responses',
      'New rate limit headers added',
    ],
  };

  const key = `${fromVersion}-${toVersion}`;
  return guides[key] || [];
}
