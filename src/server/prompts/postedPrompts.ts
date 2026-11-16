import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PromptCategory } from "@/data/prompts";
import { estimate_context_tokens } from "@/lib/estimateContextTokens";
import type { PromptView } from "@/lib/promptView";
import { splitFileLines } from "@/lib/splitFileLines";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createPublicSupabase } from "@/server/supabase/publicClient";

/** Cache tags: every posted prompt, and one prompt by slug. Updated by the create action. */
export const POSTED_PROMPTS_TAG = "posted-prompts";
export function getPostedPromptTag(slug: string): string {
  return `posted-prompt-${slug}`;
}

/** The columns /prompts/[slug] needs (the row also has id, author_id and created_at). */
export interface PostedPromptRow {
  slug: string;
  file_name: string;
  author_handle: string;
  title: string;
  tagline: string;
  summary: string;
  category: PromptCategory;
  meant_for: string[];
  highlights: string[];
  usage_steps: string[];
  works_with: string[];
  content: string;
  preview_line_count: number;
  /** The byline: the owner and co-authors with their usernames (embedded from post_authors). */
  post_authors: { role: "owner" | "coauthor"; joined_at: string; profiles: { username: string } | null }[];
}

export const DETAIL_COLUMNS =
  "slug, file_name, author_handle, title, tagline, summary, category, meant_for, highlights, usage_steps, works_with, content, preview_line_count, post_authors(role, joined_at, profiles(username))";

/** "@owner, @coauthor…": the owner first, then co-authors in the order they joined. */
function getByline(row: PostedPromptRow): string {
  const usernames = [...(row.post_authors ?? [])]
    .sort((first, second) =>
      first.role === second.role ? first.joined_at.localeCompare(second.joined_at) : first.role === "owner" ? -1 : 1,
    )
    .flatMap((author) => (author.profiles ? [`@${author.profiles.username}`] : []));
  return usernames.length > 0 ? usernames.join(", ") : row.author_handle;
}

export function toPromptView(row: PostedPromptRow): PromptView {
  const lines = splitFileLines(row.content);

  return {
    slug: row.slug,
    fileName: row.file_name,
    category: row.category,
    author: getByline(row),
    // Posting is free for now; paid posts arrive with checkout.
    priceUsd: 0,
    lineCount: lines.length,
    context_tokens: estimate_context_tokens(row.content),
    worksWith: row.works_with,
    // Posts don't record tested models yet.
    tested_models: [],
    excerpt: lines.slice(0, row.preview_line_count).join("\n"),
    outputExamples: [],
    title: row.title,
    tagline: row.tagline,
    summary: row.summary,
    highlights: row.highlights,
    meantFor: row.meant_for,
    usageSteps: row.usage_steps,
    fullMarkdown: row.content,
    isPosted: true,
  };
}

/**
 * A posted prompt by slug, or null. Cached until a new post updates its tag; a failed query
 * throws instead of returning null, so an outage is never cached as "not found".
 */
export async function getPostedPrompt(slug: string): Promise<PromptView | null> {
  "use cache";
  cacheTag(POSTED_PROMPTS_TAG, getPostedPromptTag(slug));
  cacheLife("hours");

  const supabase = createPublicSupabase();
  if (!supabase || !SLUG_PATTERN.test(slug)) return null;

  const { data, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<PostedPromptRow>();
  if (error) throw new Error(`Couldn't load posted prompt "${slug}": ${error.message}`);
  return data ? toPromptView(data) : null;
}
