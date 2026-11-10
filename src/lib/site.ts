/**
 * Single source of truth for the app name, title format and contact details.
 * Translated copy (tagline, description) lives in src/i18n/locales; the brand name does not translate.
 */
export const siteConfig = {
  name: "mdstore",
  titleSeparator: " | ",
  /** Placeholder contact inbox shown in the footer. */
  contactEmail: "hello@mdstore.dev",
  /** Static so the footer stays prerenderable (no `new Date()` during render). */
  copyrightYear: 2026,
} as const;

export const titleTemplate = `%s${siteConfig.titleSeparator}${siteConfig.name}`;
