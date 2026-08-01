export const privacyPolicy = `
# Privacy Policy

**Last updated:** July 17, 2026

## 1. Introduction

AccessGuard ("we," "our," "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our accessibility compliance scanning service.

## 2. Information We Collect

### Information You Provide
- Account information: name, email address, organization name
- Payment information: processed by Stripe, we never store full card details
- Website URLs and HTML content you submit for scanning
- Communication preferences and support inquiries

### Information Collected Automatically
- Usage data: pages visited, features used, scan frequency
- Device and browser information
- IP address and location data (country level only)
- Log data including timestamps and error events

## 3. How We Use Your Information

- Provide and maintain the accessibility scanning service
- Generate compliance reports and remediation suggestions
- Process payments and manage subscriptions
- Send service-related communications
- Improve and optimize our service
- Comply with legal obligations

## 4. Legal Basis for Processing (GDPR)

We process your data based on:
- **Contract performance**: providing the scanning service you subscribed to
- **Legitimate interests**: improving our service, security monitoring
- **Consent**: marketing communications (opt-in)
- **Legal obligation**: retaining records for tax and regulatory purposes

## 5. Data Retention

We retain your data for the duration of your account plus 90 days after deletion. Audit logs are retained for 3 years for compliance purposes. Aggregated analytics may be retained indefinitely after anonymization.

## 6. Data Subject Rights

Under GDPR and CCPA, you have the right to:
- **Access**: request a copy of your data via Settings → Export Data
- **Correction**: update your information in Settings
- **Deletion**: delete your account via Settings → Delete Account
- **Portability**: export your data in JSON format
- **Objection**: opt out of marketing communications
- **Restriction**: limit how we process your data

To exercise these rights, visit your account settings or contact support@accessguard.dev.

## 7. Data Security

We implement industry-standard security measures:
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Regular security audits and penetration testing
- Access controls and authentication required for all API access
- SOC 2 compliance framework in progress

## 8. Third-Party Services

We use the following third-party services:
- **Stripe**: payment processing (PCI DSS compliant)
- **Neon**: database hosting (SOC 2 compliant)
- **Redis**: caching and queue management
- **Sentry**: error monitoring (DPA in place)
- **Resend**: transactional email delivery

## 9. International Data Transfers

Data is stored on Neon servers in US East (Virginia). For EU users, we have Standard Contractual Clauses in place with all sub-processors to ensure adequate protection.

## 10. Cookies

We use essential cookies for authentication and session management. Analytics cookies are used only with your consent. See our Cookie Policy for details.

## 11. Changes to This Policy

We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.

## 12. Contact

Privacy questions: privacy@accessguard.dev
Data Protection Officer: dpo@accessguard.dev
Registered address: 123 Tech Lane, San Francisco, CA 94105, USA
`;

export const termsOfService = `
# Terms of Service

**Last updated:** July 17, 2026

## 1. Acceptance of Terms

By using AccessGuard ("the Service"), you agree to these Terms of Service. If you do not agree, do not use the Service.

## 2. Service Description

AccessGuard is an automated WCAG compliance scanning service that:
- Analyzes websites for accessibility violations
- Generates compliance reports and remediation suggestions
- Integrates with GitHub for automated fix PRs
- Provides scheduling and monitoring capabilities

## 3. User Responsibilities

You agree to:
- Provide accurate account information
- Maintain the confidentiality of your credentials
- Use the Service in compliance with applicable laws
- Not use the Service to scan websites you do not own or have permission to scan
- Not attempt to circumvent rate limits or security measures

## 4. Scanning Limitations

- You may only scan websites you own or have explicit permission to scan
- Scanning frequency is subject to rate limits defined in our API documentation
- We reserve the right to block excessive or abusive scanning
- Scan results are provided "as-is" and should not be the sole basis for compliance decisions

## 5. Intellectual Property

- You retain all rights to your website content and scan data
- AccessGuard owns the Service, UI, and analysis algorithms
- Remediation suggestions are provided as guidance and may require professional review

## 6. Payments and Subscriptions

- Paid plans are billed monthly or annually as selected
- Refunds are provided within 14 days of purchase for annual plans
- Account downgrades take effect at the end of the current billing period
- Unpaid accounts may be suspended after 7 days and deleted after 30 days

## 7. Limitation of Liability

AccessGuard provides compliance scanning tools but is not a substitute for:
- Professional accessibility audits
- Legal advice regarding compliance requirements
- Manual testing with assistive technologies

To the maximum extent permitted by law, AccessGuard's liability is limited to the amount paid for the Service in the 12 months preceding a claim.

## 8. Termination

We may terminate or suspend your account for:
- Violation of these terms
- Non-payment
- Illegal or abusive use of the Service
- Inactivity exceeding 12 months

## 9. Governing Law

These terms are governed by the laws of the State of California, USA. Disputes shall be resolved in San Francisco County courts.

## 10. Changes to Terms

We will notify you of material changes 30 days in advance via email or in-app notification.

## 11. Contact

Legal inquiries: legal@accessguard.dev
`;
