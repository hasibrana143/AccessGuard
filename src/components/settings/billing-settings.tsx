'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function BillingSettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();

  const [billingLoading, setBillingLoading] = useState(false);
  const [currency, setCurrency] = useState('usd');
  const [currencySaving, setCurrencySaving] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; percentOff: number | null; description?: string } | null>(null);
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; amount: number; status: string; createdAt: string; url: string | null }>>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesDemo, setInvoicesDemo] = useState(false);
  const [usage, setUsage] = useState<{ websitesUsed: number; pagesScanned: number; scansRun: number; period: number } | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch(`/api/stats/usage?orgId=${user?.orgId}`);
        const data = await res.json();
        if (data.success) setUsage(data.data);
      } catch { /* ignore */ }
    };
    if (user?.orgId) fetchUsage();
  }, [user?.orgId]);

  const handleCheckout = async (plan: string) => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: user?.orgId, plan, interval: 'monthly', email: user?.email }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast({ title: tc('error'), description: data.error || t('checkoutFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('billingConnectFailed'), variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setBillingLoading(true);
    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false, reactivate: false }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('canceled'), description: data.data?.message || t('canceledMsg') });
      } else {
        toast({ title: tc('error'), description: data.error || t('cancelFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('cancelFailedMsg'), variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
    setCurrencySaving(true);
    try {
      const res = await fetch('/api/billing/currency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('currencyUpdated'), description: t('currencyUpdatedMsg', { code: data.data.currency.toUpperCase() }) });
      } else {
        toast({ title: tc('error'), description: data.error || t('currencyUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('currencyUpdateFailed'), variant: 'destructive' });
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponLoading(true);
    try {
      const res = await fetch('/api/stripe/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('couponAppliedTitle'), description: data.data.description });
        setActiveCoupon(data.data);
        setCouponCode('');
      } else {
        toast({ title: tc('error'), description: data.error || t('invalidCoupon'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('couponApplyFailed'), variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
          <CardDescription>{t('manageSubscription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-medium">{t('growthPlan')}</p>
              <p className="text-sm text-muted-foreground">{t('billedMonthly')}</p>
            </div>
            <Badge className="bg-emerald-700 text-white">{t('active')}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">{t('websites')}</p>
              <p className="text-2xl font-bold">{usage?.websitesUsed ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">{t('pagesScanned30d')}</p>
              <p className="text-2xl font-bold">{usage?.pagesScanned?.toLocaleString() ?? 0} <span className="text-sm font-normal text-muted-foreground">/ 1,000</span></p>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">{t('scansRun30d')}</p>
            <p className="text-2xl font-bold">{usage?.scansRun ?? 0}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={billingLoading} onClick={handleCancelSubscription}>{t('cancelSubscription')}</Button>
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={billingLoading} onClick={() => handleCheckout('agency')}>
              {billingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('upgradePlan')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('billingCurrency')}</CardTitle>
          <CardDescription>{t('billingCurrencyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="billing-currency">{t('currency')}</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={currencySaving}>
                <SelectTrigger id="billing-currency" className="w-full">
                  <SelectValue placeholder={t('selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">{t('usd')}</SelectItem>
                  <SelectItem value="eur">{t('eur')}</SelectItem>
                  <SelectItem value="gbp">{t('gbp')}</SelectItem>
                  <SelectItem value="inr">{t('inr')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" disabled={currencySaving} onClick={handleSaveCurrency}>
              {currencySaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('saving')}</> : t('saveCurrency')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('fxRatesHint')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('paymentMethod')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</p>
                <p className="text-sm text-muted-foreground">{t('expires')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={billingLoading} onClick={() => handleCheckout('growth')}>
              {t('update')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('coupons')}</CardTitle>
          <CardDescription>{t('couponsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCoupon ? (
            <div className="flex items-center justify-between p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
              <div>
                <p className="font-medium text-emerald-500">{activeCoupon.code}</p>
                <p className="text-sm text-muted-foreground">
                  {activeCoupon.percentOff != null ? t('percentOff', { percent: activeCoupon.percentOff }) : ''}
                  {' — '}{activeCoupon.description || t('couponApplied')}
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">{t('applied')}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noCoupon')}</p>
          )}
          <div className="flex gap-2">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="coupon-code" className="sr-only">{t('couponCode')}</Label>
              <Input id="coupon-code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder={t('couponPlaceholder')} autoComplete="off" />
            </div>
            <Button variant="outline" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon}>
              {couponLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('applying')}</> : t('applyCoupon')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('invoices')}</CardTitle>
          <CardDescription>
            {t('invoicesDesc')}
            {invoicesDemo && <span className="ml-2 text-xs text-muted-foreground">{t('invoicesSample')}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('noInvoices')}</p>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 p-4">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{inv.number}</span>
                      <Badge variant="outline" className={`text-xs ${inv.status === 'paid' ? 'border-emerald-500/20 text-emerald-500' : inv.status === 'open' ? 'border-orange-500/20 text-orange-500' : ''}`}>
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium">${(inv.amount / 100).toFixed(2)}</span>
                  <Button variant="ghost" size="sm" aria-label={t('downloadInvoice')} disabled={!inv.url} onClick={() => inv.url && window.open(inv.url, '_blank', 'noopener,noreferrer')}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
