import type { Messages } from "@/i18n/messages";

export type HomeSectionKey = keyof Messages["home"]["outline"]["sections"];

export interface HomeSection {
  /** The section element's id, used by the outline links and the "Next" links. */
  id: string;
  /** Its label under `home.outline.sections`. */
  key: HomeSectionKey;
  /** Heading level shown in the outline (`#` or `##`), as in a Markdown file. */
  level: 1 | 2;
}

/** The landing page read as one Markdown file, in reading order. */
export const homeSections: HomeSection[] = [
  { id: "intro", key: "intro", level: 1 },
  { id: "featured", key: "featured", level: 2 },
  { id: "how-it-works", key: "howItWorks", level: 2 },
  { id: "why-markdown", key: "whyMarkdown", level: 2 },
  { id: "upload", key: "upload", level: 2 },
  { id: "faq", key: "faq", level: 2 },
];
