/**
 * The first lines of a prompt file, shown in the hero's editor window. A segment is plain text, or
 * `{ inline: "…" }` for a piece highlighted as code within the line. Decorative sample copy, not
 * translated.
 */
export type HeroFileSegment = string | { inline: string };

export interface HeroFileLine {
  token?: "heading" | "comment";
  segments: HeroFileSegment[];
}

export const hero_file_lines: HeroFileLine[] = [
  { token: "heading", segments: ["# Senior Next.js pair programmer"] },
  { segments: [""] },
  { token: "heading", segments: ["## Before writing code"] },
  { segments: ["- Read the installed framework docs first."] },
  { segments: ["- Ask when a requirement is ambiguous."] },
  { segments: [""] },
  { token: "heading", segments: ["## Conventions"] },
  { segments: ["- Explicit return types, ", { inline: "no any" }, "."] },
  { segments: ["- Semantic HTML, WCAG 2.1 AA."] },
  { segments: ["- Colours only through ", { inline: ":root" }, " tokens."] },
  { segments: [""] },
  { token: "comment", segments: ["<!-- 128 more lines -->"] },
];
