import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - AccessGuard',
  description: 'AccessGuard privacy policy - how we collect, use, and protect your data.',
};

export default async function PrivacyPage() {
  const t = await getTranslations('legal');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: September 1, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              AccessGuard collects information you provide directly, information generated from your use of our services,
              and information from third parties.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Name, email address, organization name, and password when you create an account.</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe. We do not store credit card numbers.</li>
              <li><strong>Project Data:</strong> URLs, HTML content, and accessibility scan results for websites you submit for scanning.</li>
              <li><strong>Usage Data:</strong> Pages scanned, features used, API calls, and interaction patterns to improve our service.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers for security and analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide, maintain, and improve our accessibility scanning services</li>
              <li>To process scans and generate compliance reports</li>
              <li>To send you service-related communications (scan results, security alerts)</li>
              <li>To process payments and manage subscriptions</li>
              <li>To detect and prevent fraud, abuse, and security incidents</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share information with:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Service Providers:</strong> Third parties that help us operate our service (hosting, payment processing, analytics).</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or valid legal process.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to you).</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize sharing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including encryption in transit (TLS 1.3) and at rest (AES-256),
              multi-factor authentication, and regular security audits. No system is 100% secure, but we
              work to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active or as needed to provide services. After account deletion,
              we remove personal data within 30 days, except where required by law. Scan results and compliance reports may be
              retained in anonymized form for service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground">
              If you are in the European Economic Area, you have rights under GDPR:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data in machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Restriction:</strong> Request restricted processing in certain circumstances</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at privacy@accessguard.dev or use the data export/delete tools in Settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. CCPA Rights (California)</h2>
            <p className="text-muted-foreground">
              California residents have the right to know what personal information we collect, request deletion,
              opt out of the sale of personal information, and not be discriminated against for exercising their rights.
              We do not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. Analytics cookies help us understand
              how you use our service. You can manage cookie preferences through our cookie consent banner or your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              AccessGuard is not intended for children under 16. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy from time to time. We will notify you of material changes by email or in-app notification.
              Continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries:<br />
              Email: privacy@accessguard.dev<br />
              Data Protection Officer: dpo@accessguard.dev<br />
              Address: AccessGuard Inc., 123 Accessibility Lane, San Francisco, CA 94105
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
