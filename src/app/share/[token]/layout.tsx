import type { Metadata } from 'next';

// Share links are unauthenticated and token-gated — never index them.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
