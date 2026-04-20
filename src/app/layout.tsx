import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
