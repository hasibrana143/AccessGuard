'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(nextLocale: string) {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      // Re-render the current route in the new locale (URLs are unprefixed —
      // locale lives in the cookie, so a simple refresh is deterministic).
      window.location.reload();
    });
  }

  return (
    <Select value={locale} onValueChange={onSelectChange} disabled={isPending}>
      <SelectTrigger
        aria-label="Language"
        className="h-8 w-[130px] text-xs"
      >
        <SelectValue>{LOCALE_LABELS[locale] ?? locale}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LOCALE_LABELS).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
