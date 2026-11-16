import type { Messages } from "@/i18n/messages";

/** Keys of `nav` in common.json that appear in the header and the footer. */
export type NavLinkKey = keyof Pick<Messages["nav"], "browse" | "howItWorks" | "upload" | "faq">;

export interface NavLink {
  key: NavLinkKey;
  /** Locale-aware target: a landing-page section (`hash`) or a page of its own. */
  href: { pathname: string; hash?: string };
}

/** Header and footer links: landing-page sections, plus the page for people who want to post a prompt. */
export const navLinks: NavLink[] = [
  { key: "browse", href: { pathname: "/", hash: "featured" } },
  { key: "howItWorks", href: { pathname: "/", hash: "how-it-works" } },
  { key: "upload", href: { pathname: "/upload" } },
  { key: "faq", href: { pathname: "/", hash: "faq" } },
];
