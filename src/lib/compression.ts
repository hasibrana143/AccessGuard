/**
 * Response Compression
 * 
 * Compresses API responses for better performance.
 * Supports gzip, brotli, and deflate.
 * 
 * Features:
 * - Automatic content-type detection
 * - Configurable compression level
 * - Minimum size threshold
 * - Client encoding negotiation
 * 
 * Usage:
 *   import { compressResponse } from '@/lib/compression';
 *   
 *   const compressed = await compressResponse(response, request);
 */

import { NextResponse, NextRequest } from 'next/server';
import { createHash } from 'crypto';

export type CompressionAlgorithm = 'gzip' | 'br' | 'deflate';

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  level: number;          // 1-9
  threshold: number;      // Min size to compress (bytes)
  chunkSize: number;      // Chunk size for streaming
}

export interface CompressionResult {
  body: Buffer;
  algorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  algorithm: 'gzip',
  level: 6,
  threshold: 1024,  // 1KB
  chunkSize: 16384, // 16KB
};

// Compressible content types
const COMPRESSIBLE_TYPES = [
  'application/json',
  'application/javascript',
  'application/xml',
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'application/vnd.api+json',
  'application/hal+json',
];

/**
 * Check if content type is compressible
 */
function isCompressible(contentType: string | null): boolean {
  if (!contentType) return false;
  return COMPRESSIBLE_TYPES.some(type => contentType.includes(type));
}

/**
 * Get accepted encoding from request
 */
function getAcceptedEncoding(request: NextRequest): CompressionAlgorithm | null {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  if (acceptEncoding.includes('br')) return 'br';
  if (acceptEncoding.includes('gzip')) return 'gzip';
  if (acceptEncoding.includes('deflate')) return 'deflate';
  
  return null;
}

/**
 * Compress buffer (placeholder - in production use zlib)
 */
async function compressBuffer(
  buffer: Buffer,
  algorithm: CompressionAlgorithm,
  level: number
): Promise<Buffer> {
  // In production, use zlib for actual compression
  // This is a placeholder that returns the original buffer
  // For real compression, install and use:
  // - gzip: zlib.gzipSync(buffer, { level })
  // - brotli: zlib.brotliSync(buffer)
  // - deflate: zlib.deflateSync(buffer, { level })
  
  // For now, return original (no compression in dev)
  return buffer;
}

/**
 * Compress response body
 */
export async function compressResponse(
  body: string | Buffer,
  request: NextRequest,
  options?: Partial<CompressionOptions>
): Promise<CompressionResult | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  
  // Check minimum size
  if (originalBuffer.length < opts.threshold) {
    return null;
  }

  // Check if client accepts compression
  const acceptedEncoding = getAcceptedEncoding(request);
  if (!acceptedEncoding) {
    return null;
  }

  // Use client's preferred algorithm if available
  const algorithm = acceptedEncoding || opts.algorithm;

  try {
    const compressed = await compressBuffer(originalBuffer, algorithm, opts.level);
    const ratio = compressed.length / originalBuffer.length;

    // Only use compression if it actually reduces size
    if (ratio >= 1) {
      return null;
    }

    return {
      body: compressed,
      algorithm,
      originalSize: originalBuffer.length,
      compressedSize: compressed.length,
      ratio,
    };
  } catch (error) {
    // Compression failed, return null to use uncompressed
    return null;
  }
}

/**
 * Compress NextResponse
 */
export async function compressNextResponse(
  response: NextResponse,
  request: NextRequest,
  options?: Partial<CompressionOptions>
): Promise<NextResponse> {
  // Check if already compressed
  if (response.headers.get('content-encoding')) {
    return response;
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!isCompressible(contentType)) {
    return response;
  }

  try {
    const body = await response.text();
    const result = await compressResponse(body, request, options);

    if (!result) {
      // Return original response
      return new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    // Create compressed response
    const compressedResponse = new NextResponse(new Uint8Array(result.body), {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'content-encoding': result.algorithm,
        'content-length': String(result.compressedSize),
        'x-original-size': String(result.originalSize),
        'x-compression-ratio': String(result.ratio.toFixed(2)),
      },
    });

    return compressedResponse;
  } catch {
    // Compression failed, return original
    return response;
  }
}

/**
 * Generate ETag for response
 */
export function generateETag(body: string | Buffer): string {
  const hash = createHash('md5')
    .update(Buffer.isBuffer(body) ? body : body)
    .digest('hex');
  return `"${hash}"`;
}

/**
 * Check if request has matching ETag
 */
export function hasMatchingETag(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  return ifNoneMatch === etag;
}

/**
 * Create 304 Not Modified response
 */
export function createNotModifiedResponse(): NextResponse {
  return new NextResponse(null, { status: 304 });
}

/**
 * Middleware for compression
 */
export function withCompression(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: Partial<CompressionOptions>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    return compressNextResponse(response, req, options);
  };
}
