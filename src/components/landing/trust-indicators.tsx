import { getTranslations } from 'next-intl/server';

export async function TrustIndicators() {
  const t = await getTranslations('landing');
  const items = [
    { stat: '500+', label: t('companiesProtected') },
    { stat: '2M+', label: t('pagesScanned') },
    { stat: '50K+', label: t('issuesFixed') },
    { stat: '99.9%', label: t('uptimeSla') },
  ];
  return (
    <section className="py-12 border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-8">{t('trustedBy')}</p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {items.map((item) => (
            <div key={item.label} className="text-center px-6 py-3">
              <div className="text-2xl font-bold text-foreground">{item.stat}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
