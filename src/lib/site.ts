/** Single source of truth for the app name, title format and contact details. */
export const siteConfig = {
  name: "mdstore",
  titleSeparator: " | ",
  tagline: "The marketplace for coding prompts",
  description:
    "Buy and sell battle-tested coding prompts as plain Markdown files. Preview every .md before you buy, then drop it straight into your repo.",
  /** Placeholder inbox for seller applications until the seller onboarding flow exists. */
  sellerContactEmail: "sellers@mdstore.dev",
  /** Static so the footer stays prerenderable (no `new Date()` during render). */
  copyrightYear: 2026,
} as const;

export const titleTemplate = `%s${siteConfig.titleSeparator}${siteConfig.name}`;
