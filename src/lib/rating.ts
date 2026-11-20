import { z } from "zod";

/** The stars a reader can give, lowest first. */
export const STAR_VALUES = [1, 2, 3, 4, 5] as const;
export const MAX_STARS = STAR_VALUES.length;

/** A prompt's public rating: the mean stars (one decimal) and how many readers rated it. */
export interface PromptRating {
  average: number;
  count: number;
}

/** The totals kept on posted_prompts (rating_count, rating_sum) as a rating; average 0 while unrated. */
export function to_prompt_rating(count: number, sum: number): PromptRating {
  if (count <= 0) return { average: 0, count: 0 };
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** How much of the five stars to fill, as a percentage (4.3 → 86). */
export function rating_fill_percent(average: number): number {
  return Math.min(100, Math.max(0, (average / MAX_STARS) * 100));
}

/** A reader's stars, or null to remove their rating. Shared by the form and the server action. */
export const stars_schema = z.number().int().min(1).max(MAX_STARS).nullable();
