import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as localeParam } from "next/root-params";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";

/**
 * Per-request i18n config for Server Components. The locale comes from the `[locale]` root
 * segment via next/root-params rather than a request header, so pages stay prerenderable under
 * Cache Components.
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const requested = explicitLocale ?? (await localeParam());
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
