export interface NavLink {
  href: string;
  label: string;
}

/** In-page sections of the landing page, shared by the header and the footer. */
export const navLinks: NavLink[] = [
  { href: "/#featured", label: "Browse prompts" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#sell", label: "Sell your prompts" },
  { href: "/#faq", label: "FAQ" },
];
