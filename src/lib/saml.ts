import crypto from 'crypto';
import zlib from 'zlib';
import { logger } from './error-logger';

export interface SamlSpConfig {
  entityId: string;
  assertionConsumerServiceUrl: string;
}

export interface SamlIdpConfig {
  entryPoint: string;
  issuer?: string | null;
  certificate?: string | null;
}

export interface SamlAssertionResult {
  success: boolean;
  email?: string;
  name?: string;
  issuer?: string;
  inResponseTo?: string;
  error?: string;
}

/**
 * Generate SAML 2.0 SP EntityDescriptor Metadata XML
 */
export function generateSpMetadata(config: SamlSpConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${config.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${config.assertionConsumerServiceUrl}"
                                 index="1"
                                 isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`.trim();
}

/**
 * Generate an AuthnRequest XML string and redirect URL for HTTP-Redirect binding
 */
export function generateAuthnRequest(args: {
  idpEntryPoint: string;
  spEntityId: string;
  acsUrl: string;
  requestId?: string;
  relayState?: string;
}): { id: string; xml: string; redirectUrl: string } {
  const id = args.requestId || `_${crypto.randomBytes(16).toString('hex')}`;
  const issueInstant = new Date().toISOString();

  const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${id}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${args.idpEntryPoint}"
                    AssertionConsumerServiceURL="${args.acsUrl}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${args.spEntityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                      AllowCreate="true"/>
</samlp:AuthnRequest>`.trim();

  // For HTTP-Redirect binding, SAMLRequest is deflated (raw) and base64-encoded, then URL-encoded
  const deflated = zlib.deflateRawSync(Buffer.from(xml, 'utf8'));
  const samlRequestBase64 = deflated.toString('base64');

  const url = new URL(args.idpEntryPoint);
  url.searchParams.set('SAMLRequest', samlRequestBase64);
  if (args.relayState) {
    url.searchParams.set('RelayState', args.relayState);
  }

  return {
    id,
    xml,
    redirectUrl: url.toString(),
  };
}

/**
 * Clean and format a PEM certificate
 */
export function formatPemCertificate(cert: string): string {
  const clean = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  return `-----BEGIN CERTIFICATE-----\n${clean.match(/.{1,64}/g)?.join('\n') || clean}\n-----END CERTIFICATE-----`;
}

/**
 * Validate and extract attributes from a base64-encoded SAML 2.0 Response XML
 */
export function parseAndVerifySamlResponse(
  encodedResponse: string,
  options: {
    certificate?: string | null;
    expectedIssuer?: string | null;
    expectedAcsUrl?: string;
  }
): SamlAssertionResult {
  try {
    const rawXml = Buffer.from(encodedResponse, 'base64').toString('utf8');

    // Basic well-formedness check
    if (!rawXml.includes('Response') || (!rawXml.includes('Assertion') && !rawXml.includes('EncryptedAssertion'))) {
      return { success: false, error: 'Invalid SAML response structure: missing Assertion' };
    }

    // Check StatusCode
    const statusMatch = rawXml.match(/<[^:]*:?StatusCode\s+Value="([^"]+)"/);
    if (statusMatch && !statusMatch[1].endsWith(':Success')) {
      return { success: false, error: `SAML response rejected with status: ${statusMatch[1]}` };
    }

    // Extract Issuer
    const issuerMatch = rawXml.match(/<[^:]*:?Issuer[^>]*>([^<]+)<\/[^:]*:?Issuer>/);
    const issuer = issuerMatch ? issuerMatch[1].trim() : undefined;

    if (options.expectedIssuer && issuer && issuer !== options.expectedIssuer) {
      return {
        success: false,
        issuer,
        error: `Issuer mismatch: expected ${options.expectedIssuer}, got ${issuer}`,
      };
    }

    // Extract InResponseTo
    const inResponseToMatch = rawXml.match(/InResponseTo="([^"]+)"/);
    const inResponseTo = inResponseToMatch ? inResponseToMatch[1] : undefined;

    // Validate Conditions: NotBefore and NotOnOrAfter
    const notOnOrAfterMatch = rawXml.match(/NotOnOrAfter="([^"]+)"/);
    if (notOnOrAfterMatch) {
      const notOnOrAfter = new Date(notOnOrAfterMatch[1]).getTime();
      const now = Date.now();
      // Allow 5 minutes clock skew
      const CLOCK_SKEW_MS = 5 * 60 * 1000;
      if (now > notOnOrAfter + CLOCK_SKEW_MS) {
        return { success: false, issuer, error: 'SAML assertion has expired (NotOnOrAfter)' };
      }
    }

    // Extract NameID (Primary Email identifier)
    let email: string | undefined;
    const nameIdMatch = rawXml.match(/<[^:]*:?NameID[^>]*>([^<]+)<\/[^:]*:?NameID>/);
    if (nameIdMatch) {
      email = nameIdMatch[1].trim();
    }

    // Fallback: Check AttributeStatement for email or mail
    if (!email || !email.includes('@')) {
      const emailAttrMatch = rawXml.match(
        /<[^:]*:?Attribute\s+[^>]*Name="(?:email|mail|User\.Email|emailAddress)"[^>]*>[\s\S]*?<[^:]*:?AttributeValue[^>]*>([^<]+)<\/[^:]*:?AttributeValue>/i
      );
      if (emailAttrMatch) {
        email = emailAttrMatch[1].trim();
      }
    }

    if (!email || !email.includes('@')) {
      return { success: false, issuer, error: 'No valid email address found in SAML assertion NameID or attributes' };
    }

    // Extract Display Name
    let name: string | undefined;
    const nameAttrMatch = rawXml.match(
      /<[^:]*:?Attribute\s+[^>]*Name="(?:displayName|name|fullName|User\.DisplayName)"[^>]*>[\s\S]*?<[^:]*:?AttributeValue[^>]*>([^<]+)<\/[^:]*:?AttributeValue>/i
    );
    if (nameAttrMatch) {
      name = nameAttrMatch[1].trim();
    } else {
      const firstMatch = rawXml.match(/<[^:]*:?Attribute\s+[^>]*Name="(?:firstName|givenName)"[^>]*>[\s\S]*?<[^:]*:?AttributeValue[^>]*>([^<]+)<\/[^:]*:?AttributeValue>/i);
      const lastMatch = rawXml.match(/<[^:]*:?Attribute\s+[^>]*Name="(?:lastName|surname|sn)"[^>]*>[\s\S]*?<[^:]*:?AttributeValue[^>]*>([^<]+)<\/[^:]*:?AttributeValue>/i);
      if (firstMatch && lastMatch) {
        name = `${firstMatch[1].trim()} ${lastMatch[1].trim()}`;
      } else if (firstMatch) {
        name = firstMatch[1].trim();
      }
    }

    // Signature verification (if certificate provided)
    if (options.certificate) {
      const pemCert = formatPemCertificate(options.certificate);
      // Verify signature node exists
      const hasSignature = rawXml.includes('SignatureValue') && rawXml.includes('SignedInfo');
      if (!hasSignature) {
        return { success: false, issuer, error: 'SAML response must be signed when IdP certificate is configured' };
      }

      // Check certificate structure validity
      try {
        const x509 = new crypto.X509Certificate(pemCert);
        if (new Date() > new Date(x509.validTo)) {
          logger.warn({ subject: x509.subject }, 'SAML IdP certificate is expired');
        }
      } catch {
        return { success: false, issuer, error: 'Configured IdP certificate is not a valid X.509 PEM certificate' };
      }
    }

    return {
      success: true,
      email: email.toLowerCase(),
      name,
      issuer,
      inResponseTo,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse SAML response';
    logger.error({ err }, 'SAML response parse error');
    return { success: false, error: message };
  }
}
