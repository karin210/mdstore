import type { PromptListing } from "@/data/prompts";

/**
 * Everything /prompts/[slug] shows about one prompt, whatever its source: a catalogue listing
 * (src/data/prompts.ts + the message catalogue) or a prompt a user posted (Supabase).
 */
export interface PromptView extends Omit<PromptListing, "slug"> {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  highlights: string[];
  meantFor: string[];
  usageSteps: string[];
  /** The whole file, for free prompts only; null for paid ones so it never reaches the page. */
  fullMarkdown: string | null;
}
