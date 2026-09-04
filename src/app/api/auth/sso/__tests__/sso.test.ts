import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSpMetadata, generateAuthnRequest, parseAndVerifySamlResponse } from '@/lib/saml';
import { GET as getMetadata } from '../metadata/route';
import { GET as getLogin } from '../login/route';
import { POST as postCallback } from '../callback/route';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
  AUDIT_ACTIONS: [
    'sso_login_success',
    'sso_login_failure',
  ],
}));

vi.mock('@/lib/error-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 3600 }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client-id'),
  createRateLimitResponse: vi.fn(),
  rateLimits: { default: { interval: 60000, limit: 100 } },
}));

describe('SAML 2.0 Utilities', () => {
  it('generates SP metadata XML with correct entityID and ACS URL', () => {
    const xml = generateSpMetadata({
      entityId: 'https://accessguard.io/api/auth/sso/metadata',
      assertionConsumerServiceUrl: 'https://accessguard.io/api/auth/sso/callback',
    });
    expect(xml).toContain('entityID="https://accessguard.io/api/auth/sso/metadata"');
    expect(xml).toContain('Location="https://accessguard.io/api/auth/sso/callback"');
    expect(xml).toContain('urn:oasis:names:tc:SAML:2.0:metadata');
  });

  it('generates AuthnRequest redirect URL with SAMLRequest and RelayState', () => {
    const result = generateAuthnRequest({
      idpEntryPoint: 'https://idp.okta.com/app/sso',
      spEntityId: 'https://accessguard.io/api/auth/sso/metadata',
      acsUrl: 'https://accessguard.io/api/auth/sso/callback',
      relayState: 'custom-state-123',
    });

    expect(result.redirectUrl).toContain('https://idp.okta.com/app/sso');
    expect(result.redirectUrl).toContain('SAMLRequest=');
    expect(result.redirectUrl).toContain('RelayState=custom-state-123');
    expect(result.xml).toContain('AuthnRequest');
  });

  it('parses valid SAML assertion and extracts user details', () => {
    const validXml = `
      <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <samlp:Status>
          <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion>
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <saml:Subject>
            <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">enterprise.user@corp.com</saml:NameID>
          </saml:Subject>
          <saml:Conditions NotBefore="2020-01-01T00:00:00Z" NotOnOrAfter="2035-01-01T00:00:00Z"/>
          <saml:AttributeStatement>
            <saml:Attribute Name="displayName">
              <saml:AttributeValue>Enterprise User</saml:AttributeValue>
            </saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
      </samlp:Response>
    `;
    const encoded = Buffer.from(validXml).toString('base64');

    const result = parseAndVerifySamlResponse(encoded, {
      expectedIssuer: 'https://idp.example.com',
    });

    expect(result.success).toBe(true);
    expect(result.email).toBe('enterprise.user@corp.com');
    expect(result.name).toBe('Enterprise User');
    expect(result.issuer).toBe('https://idp.example.com');
  });

  it('rejects expired SAML assertion', () => {
    const expiredXml = `
      <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <samlp:Status>
          <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion>
          <saml:Issuer>https://idp.example.com</saml:Issuer>
          <saml:Subject>
            <saml:NameID>old.user@corp.com</saml:NameID>
          </saml:Subject>
          <saml:Conditions NotOnOrAfter="2020-01-01T00:00:00Z"/>
        </saml:Assertion>
      </samlp:Response>
    `;
    const encoded = Buffer.from(expiredXml).toString('base64');
    const result = parseAndVerifySamlResponse(encoded, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });
});

describe('SAML Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/auth/sso/metadata returns XML response', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/sso/metadata');
    const res = await getMetadata(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('samlmetadata+xml');
    const body = await res.text();
    expect(body).toContain('EntityDescriptor');
  });

  it('GET /api/auth/sso/login redirects to IdP when org is configured', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-test-sso',
      ssoEnabled: true,
      ssoEntryPoint: 'https://idp.okta.com/entry',
      ssoIssuer: 'https://idp.okta.com/issuer',
    } as never);

    const req = new NextRequest('http://localhost:3000/api/auth/sso/login?orgId=org-test-sso');
    const res = await getLogin(req);

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('https://idp.okta.com/entry');
    expect(location).toContain('SAMLRequest=');
  });

  it('POST /api/auth/sso/callback validates assertion and provisions user session', async () => {
    const validXml = `
      <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        <samlp:Status>
          <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion>
          <saml:Issuer>https://idp.okta.com/issuer</saml:Issuer>
          <saml:Subject>
            <saml:NameID>saml.test@company.com</saml:NameID>
          </saml:Subject>
          <saml:Conditions NotBefore="2020-01-01T00:00:00Z" NotOnOrAfter="2035-01-01T00:00:00Z"/>
        </saml:Assertion>
      </samlp:Response>
    `;
    const samlResponse = Buffer.from(validXml).toString('base64');
    const relayState = Buffer.from(JSON.stringify({ orgId: 'org-test-sso' })).toString('base64');

    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-test-sso',
      ssoEnabled: true,
      ssoIssuer: 'https://idp.okta.com/issuer',
      ssoProvider: 'okta',
      ssoCertificate: null,
    } as never);

    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: 'user-sso-123',
      email: 'saml.test@company.com',
      name: 'saml.test',
      orgId: 'org-test-sso',
      role: 'member',
    } as never);

    const formData = new FormData();
    formData.append('SAMLResponse', samlResponse);
    formData.append('RelayState', relayState);

    const req = new NextRequest('http://localhost:3000/api/auth/sso/callback', {
      method: 'POST',
      body: formData,
    });

    const res = await postCallback(req);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'sso_login_success',
        orgId: 'org-test-sso',
      })
    );
  });
});
