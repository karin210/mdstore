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

/** An AI model's price per million tokens in US dollars, always with cents ("$0.25", "$15.00"). */
export function format_token_price(amount_usd: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount_usd);
}
