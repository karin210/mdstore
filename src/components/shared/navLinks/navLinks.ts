import type { Messages } from "@/i18n/messages";

/** Keys of `nav` in common.json that appear in the header and the footer. */
export type NavLinkKey = keyof Pick<Messages["nav"], "browse" | "howItWorks" | "upload" | "faq">;

export interface NavLink {
  key: NavLinkKey;
  /** Locale-aware target: a landing-page section (`hash`) or a page of its own. */
  href: { pathname: string; hash?: string };
  /**
   * Whether the link sits in the header bar on wide screens. Every link is also in the header's
   * menu (the only place for them on narrow screens), so the others live in the menu alone there.
   */
  in_header_bar: boolean;
}

/** Header and footer links: landing-page sections, plus the page for people who want to post a prompt. */
export const navLinks: NavLink[] = [
  { key: "browse", href: { pathname: "/", hash: "featured" }, in_header_bar: true },
  { key: "howItWorks", href: { pathname: "/", hash: "how-it-works" }, in_header_bar: false },
  { key: "upload", href: { pathname: "/upload" }, in_header_bar: true },
  { key: "faq", href: { pathname: "/", hash: "faq" }, in_header_bar: false },
];
