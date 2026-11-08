import type { Locale } from "@/i18n/routing";

/**
 * A listing's price in the active locale's number format ("$5" / "5 US$").
 * Prices are always US dollars, whatever the UI language; pass the translated "Free" label.
 */
export function formatPrice(amountUsd: number, locale: Locale, freeLabel: string): string {
  if (amountUsd === 0) return freeLabel;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}
