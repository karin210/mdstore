import type { PromptCategory } from "@/data/prompts";
import type { PromptRating } from "@/lib/rating";

/** What a prompt card on the landing page shows, already in the page's language. */
export interface PromptCardData {
  slug: string;
  fileName: string;
  category: PromptCategory;
  title: string;
  summary: string;
  author: string;
  priceUsd: number;
  lineCount: number;
  worksWith: string[];
  rating: PromptRating;
}
