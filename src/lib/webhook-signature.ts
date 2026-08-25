/**
 * Webhook Signature Verification
 * 
 * Verifies webhook payloads using HMAC-SHA256 signatures.
 * Supports multiple signature formats:
 * - GitHub (X-Hub-Signature-256)
 * - Stripe (Stripe-Signature)
 * - Generic (X-Signature)
 * 
 * Usage:
 *   import { verifyWebhookSignature, WebhookVerifier } from '@/lib/webhook-signature';
 *   
 *   // Generic verification
 *   const isValid = await verifyWebhookSignature(
 *     payload,
 *     signature,
 *     secret,
 *     'sha256'
 *   );
 *   
 *   // GitHub verification
 *   const verifier = new WebhookVerifier('github', secret);
 *   const isValid = verifier.verify(payload, headers);
 */

import crypto from 'crypto';
import { logger } from './error-logger';

export type SignatureFormat = 'sha256' | 'sha1' | 'sha512';
export type WebhookProvider = 'github' | 'stripe' | 'generic';

export interface WebhookVerificationResult {
  valid: boolean;
  provider: WebhookProvider;
  timestamp?: Date;
  error?: string;
}

export interface WebhookVerifierOptions {
  provider: WebhookProvider;
  secret: string;
  tolerance?: number;  // Max age in seconds (default: 300 = 5 minutes)
  algorithm?: SignatureFormat;
}

/**
 * Generate HMAC signature
 */
export function generateSignature(
  payload: string | Buffer,
  secret: string,
  algorithm: SignatureFormat = 'sha256'
): string {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(typeof payload === 'string' ? payload : payload.toString());
  return `${algorithm}=${hmac.digest('hex')}`;
}

/**
 * Verify HMAC signature
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: SignatureFormat = 'sha256'
): boolean {
  const expected = generateSignature(payload, secret, algorithm);
  
  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

/**
 * Generic webhook signature verification
 */
export async function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: SignatureFormat = 'sha256'
): Promise<WebhookVerificationResult> {
  try {
    const valid = verifySignature(payload, signature, secret, algorithm);
    
    return {
      valid,
      provider: 'generic',
      error: valid ? undefined : 'Invalid signature',
    };
  } catch (error) {
    return {
      valid: false,
      provider: 'generic',
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * GitHub webhook verifier
 */
export class GitHubWebhookVerifier {
  private secret: string;
  private algorithm: SignatureFormat;

  constructor(secret: string, algorithm: SignatureFormat = 'sha256') {
    this.secret = secret;
    this.algorithm = algorithm;
  }

  verify(
    payload: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookVerificationResult {
    const signature = headers['x-hub-signature-256'] || headers['x-hub-signature'];
    
    if (!signature) {
      return {
        valid: false,
        provider: 'github',
        error: 'Missing X-Hub-Signature header',
      };
    }

    // Determine algorithm from signature prefix
    let algorithm = this.algorithm;
    if (signature.startsWith('sha256=')) {
      algorithm = 'sha256';
    } else if (signature.startsWith('sha1=')) {
      algorithm = 'sha1';
    }

    const valid = verifySignature(payload, signature, this.secret, algorithm);

    return {
      valid,
      provider: 'github',
      error: valid ? undefined : 'Invalid GitHub signature',
    };
  }
}

/**
 * Stripe webhook verifier
 */
export class StripeWebhookVerifier {
  private secret: string;
  private tolerance: number;

  constructor(secret: string, tolerance: number = 300) {
    this.secret = secret;
    this.tolerance = tolerance;
  }

  verify(
    payload: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookVerificationResult {
    const signatureHeader = headers['stripe-signature'];
    
    if (!signatureHeader) {
      return {
        valid: false,
        provider: 'stripe',
        error: 'Missing Stripe-Signature header',
      };
    }

    try {
      // Parse Stripe signature format: t=timestamp,v1=signature,...
      const elements = signatureHeader.split(',');
      const signatureMap: Record<string, string> = {};
      
      for (const element of elements) {
        const [key, value] = element.split('=');
        signatureMap[key] = value;
      }

      const timestamp = parseInt(signatureMap['t'] || '0', 10);
      const signature = signatureMap['v1'];

      if (!signature) {
        return {
          valid: false,
          provider: 'stripe',
          error: 'Missing v1 signature',
        };
      }

      // Check timestamp tolerance
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > this.tolerance) {
        return {
          valid: false,
          provider: 'stripe',
          timestamp: new Date(timestamp * 1000),
          error: 'Timestamp outside tolerance',
        };
      }

      // Create signed payload
      const signedPayload = `${timestamp}.${typeof payload === 'string' ? payload : payload.toString()}`;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(signedPayload)
        .digest('hex');

      const valid = crypto.timingSafeEqual(
        Buffer.from(`v1=${expectedSignature}`),
        Buffer.from(`v1=${signature}`)
      );

      return {
        valid,
        provider: 'stripe',
        timestamp: new Date(timestamp * 1000),
        error: valid ? undefined : 'Invalid Stripe signature',
      };
    } catch (error) {
      return {
        valid: false,
        provider: 'stripe',
        error: error instanceof Error ? error.message : 'Stripe verification failed',
      };
    }
  }
}

/**
 * Generic webhook verifier
 */
export class GenericWebhookVerifier {
  private secret: string;
  private algorithm: SignatureFormat;
  private headerName: string;

  constructor(
    secret: string,
    algorithm: SignatureFormat = 'sha256',
    headerName: string = 'x-signature'
  ) {
    this.secret = secret;
    this.algorithm = algorithm;
    this.headerName = headerName;
  }

  verify(
    payload: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookVerificationResult {
    const signature = headers[this.headerName.toLowerCase()];
    
    if (!signature) {
      return {
        valid: false,
        provider: 'generic',
        error: `Missing ${this.headerName} header`,
      };
    }

    const valid = verifySignature(payload, signature, this.secret, this.algorithm);

    return {
      valid,
      provider: 'generic',
      error: valid ? undefined : 'Invalid webhook signature',
    };
  }
}

/**
 * Unified webhook verifier factory
 */
export class WebhookVerifier {
  private verifier: GitHubWebhookVerifier | StripeWebhookVerifier | GenericWebhookVerifier;

  constructor(provider: WebhookProvider, secret: string, options?: Record<string, unknown>) {
    switch (provider) {
      case 'github':
        this.verifier = new GitHubWebhookVerifier(secret);
        break;
      case 'stripe':
        this.verifier = new StripeWebhookVerifier(secret, options?.tolerance as number);
        break;
      default:
        this.verifier = new GenericWebhookVerifier(secret);
    }
  }

  verify(
    payload: string | Buffer,
    headers: Record<string, string | undefined>
  ): WebhookVerificationResult {
    const result = this.verifier.verify(payload, headers);

    // Log verification attempt
    if (!result.valid) {
      logger.warn({
        provider: result.provider,
        error: result.error,
      }, 'Webhook signature verification failed');
    }

    return result;
  }
}

/**
 * Middleware for webhook signature verification
 */
export function withWebhookVerification(
  provider: WebhookProvider,
  secret: string,
  handler: (payload: string, req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const payload = await req.text();
      const headers: Record<string, string | undefined> = {};
      
      // Extract relevant headers
      for (const [key, value] of req.headers.entries()) {
        headers[key] = value;
      }

      const verifier = new WebhookVerifier(provider, secret);
      const result = verifier.verify(payload, headers);

      if (!result.valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create new request with parsed payload
      const newRequest = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: payload,
      });

      return handler(payload, newRequest);
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown' },
        'Webhook verification error');
      
      return new Response(
        JSON.stringify({ error: 'Webhook verification failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
