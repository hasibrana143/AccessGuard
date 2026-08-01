export function TrustIndicators() {
  return (
    <section className="py-12 border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-8">Trusted by development teams worldwide</p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {[
            { stat: '500+', label: 'Companies Protected' },
            { stat: '2M+', label: 'Pages Scanned' },
            { stat: '50K+', label: 'Issues Fixed' },
            { stat: '99.9%', label: 'Uptime SLA' }
          ].map((item) => (
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
