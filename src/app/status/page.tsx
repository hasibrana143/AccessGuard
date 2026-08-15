import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Public status page (docs/launch/ROADMAP.md: uptime/status page).
// Probes the same endpoints K8s uses (live + ready) so this page can never
// disagree with orchestrator health. Server-rendered per request; no caching.

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('statusPage');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type ProbeResult = {
  name: string;
  detail: string;
  up: boolean;
};

async function probe(path: string, labels: { ok: string; unreachable: string }): Promise<ProbeResult> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      checks?: Record<string, string>;
    };
    return {
      name: path.replace('/api/health/', ''),
      detail: body.status ?? (res.ok ? labels.ok : `HTTP ${res.status}`),
      up: res.ok,
    };
  } catch {
    return { name: path.replace('/api/health/', ''), detail: labels.unreachable, up: false };
  }
}

export default async function StatusPage() {
  const t = await getTranslations('statusPage');
  const labels = { ok: t('ok'), unreachable: t('unreachable') };
  const [live, ready] = await Promise.all([probe('/api/health/live', labels), probe('/api/health/ready', labels)]);
  const checks = [live, ready];
  const allUp = checks.every((c) => c.up);

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-lg mx-auto">
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border bg-card p-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full ${
                allUp ? 'bg-emerald-500' : 'bg-red-500'
              } animate-pulse`}
            />
            <h1 className="text-xl font-bold text-primary">
              {allUp ? t('allOperational') : t('partialOutage')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t('subtitle')}
          </p>

          <ul className="space-y-3">
            {checks.map((check) => (
              <li
                key={check.name}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
              >
                <span className="text-sm font-medium text-primary capitalize">
                  {check.name}
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${
                      check.up ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className={check.up ? 'text-emerald-500' : 'text-red-500'}>
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">
            {t('lastChecked', { time: new Date().toISOString() })}
          </p>
        </div>
      </div>
    </div>
  );
}
