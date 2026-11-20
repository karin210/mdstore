import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PromptCardData } from "@/lib/promptCard";
import { to_prompt_rating } from "@/lib/rating";
import { splitFileLines } from "@/lib/splitFileLines";
import { POSTED_PROMPTS_TAG, type PostedPromptRow } from "@/server/prompts/postedPrompts";
import { createPublicSupabase } from "@/server/supabase/publicClient";

/** How many cards the landing page's "most popular prompts" section shows. */
export const POPULAR_PROMPT_COUNT = 6;

type PopularPromptRow = Pick<
  PostedPromptRow,
  | "slug"
  | "file_name"
  | "category"
  | "title"
  | "summary"
  | "author_handle"
  | "works_with"
  | "content"
  | "rating_count"
  | "rating_sum"
>;

const POPULAR_COLUMNS =
  "slug, file_name, category, title, summary, author_handle, works_with, content, rating_count, rating_sum";

function to_card(row: PopularPromptRow): PromptCardData {
  return {
    slug: row.slug,
    fileName: row.file_name,
    category: row.category,
    title: row.title,
    summary: row.summary,
    author: row.author_handle,
    // Posting is free for now (see toPromptView in postedPrompts.ts).
    priceUsd: 0,
    lineCount: splitFileLines(row.content).length,
    worksWith: row.works_with,
    rating: to_prompt_rating(row.rating_count, row.rating_sum),
  };
}

/**
 * The approved posts with the best ratings, newest first among equals and among unrated posts
 * (the rule lives in the database function popular_prompts(); see its migration). Empty while
 * Supabase isn't configured. Cached like the other posted-prompt reads: a new post, a review
 * decision or a rating updates POSTED_PROMPTS_TAG, and a failed query throws instead of caching
 * an empty list.
 */
export async function list_popular_prompts(): Promise<PromptCardData[]> {
  "use cache";
  cacheTag(POSTED_PROMPTS_TAG);
  cacheLife("hours");

  const supabase = createPublicSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .rpc("popular_prompts", { p_limit: POPULAR_PROMPT_COUNT })
    .select(POPULAR_COLUMNS);
  if (error) throw new Error(`Couldn't list the popular prompts: ${error.message}`);
  // Untyped until `npm run db:types` is wired in; the columns are the ones selected above.
  return ((data ?? []) as PopularPromptRow[]).map(to_card);
}
