import type { PromptListing } from "@/data/prompts";
import type { PromptRating } from "@/lib/rating";

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
  /**
   * Set only when a posted prompt is shown to its author or an admin before it is public
   * ("pending", "rejected" or "withdrawn"); the page then says so. Never set on a publicly readable prompt.
   */
  reviewStatus?: "pending" | "rejected" | "withdrawn";
  /** True for prompts posted by users (they have a review page); false for the curated catalogue. */
  isPosted?: boolean;
  /** Readers' stars; only posted prompts can be rated, so catalogue listings have none. */
  rating?: PromptRating;
}

/**
 * What the listing block (PromptListing) shows. The page around it keeps the rest: the review notice, the
 * posted flag, the version, and the category id (the listing takes its label, already translated).
 */
export type PromptListingView = Omit<PromptView, "category" | "reviewStatus" | "isPosted" | "version">;

/**
 * The parts of a listing the upload preview leaves blank (keeping their space) while the author hasn't filled
 * them in. `file` covers everything measured from the file: its name, length, context and excerpt.
 */
export type ListingEmptyField =
  "file" | "category" | "title" | "tagline" | "summary" | "meantFor" | "highlights" | "usageSteps";
