import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AccessGuard - ADA Compliance SaaS Platform",
  description: "Prevent $50k+ ADA lawsuits by catching accessibility violations before they cost you. AccessGuard monitors websites for WCAG 2.1 AA compliance and generates AI-powered remediation code.",
  keywords: ["ADA compliance", "WCAG", "accessibility", "web accessibility", "ADA lawsuit prevention", "AI remediation", "accessibility scanner"],
  authors: [{ name: "AccessGuard Team" }],
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "AccessGuard - ADA Compliance Platform",
    description: "Continuous WCAG monitoring with AI-powered remediation. Prevent lawsuits, not just detect issues.",
    url: "https://accessguard.io",
    siteName: "AccessGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AccessGuard - ADA Compliance Platform",
    description: "Continuous WCAG monitoring with AI-powered remediation",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'SoftwareApplication',
                  name: 'AccessGuard',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web',
                  url: 'https://accessguard.io',
                  description:
                    'Continuous WCAG 2.1 AA compliance monitoring with AI-powered remediation and GitHub auto-PR.',
                  offers: {
                    '@type': 'Offer',
                    price: '49',
                    priceCurrency: 'USD',
                  },
                },
                {
                  '@type': 'FAQPage',
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'How does AccessGuard detect accessibility violations?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'AccessGuard crawls your site with axe-core plus fetch/DOM fallback strategies and maps findings to WCAG 2.1 AA criteria.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Can AccessGuard automatically fix violations?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes. AI remediation generates fix code with a confidence score and can open a GitHub pull request with the applied fixes.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'What compliance standards does AccessGuard cover?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'WCAG 2.1 AA, which underpins ADA, Section 508, and the European Accessibility Act (EAA) obligations.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-elevation-2"
        >
          Skip to main content
        </a>
        <Providers>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
        </Providers>
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}
