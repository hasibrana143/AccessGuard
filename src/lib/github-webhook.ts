import crypto from 'crypto';

const PREFIX = 'sha256=';

// Verify a GitHub webhook signature (x-hub-signature-256), timing-safe.
// Returns true when the secret is configured and the signature matches.
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined | null
): boolean {
  if (!secret || !signature || !signature.startsWith(PREFIX)) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  const received = signature.slice(PREFIX.length);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex')
    );
  } catch {
    return false;
  }
}