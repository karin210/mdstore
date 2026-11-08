import { defineRouting } from "next-intl/routing";

/**
 * English keeps the unprefixed URLs the site already had (`/`, `/prompts/global`), so no live
 * link moves; Spanish lives under `/es` (`/es`, `/es/prompts/global`).
 * Both locales use the same path segments (`prompts` reads naturally in Spanish too), so no
 * `pathnames` map is configured. Add one here if a locale ever needs its own slugs.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Remembers the visitor's choice; read by the browser-language detection on "/" (see src/proxy.ts).
  localeCookie: { name: "mdstore_locale", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
