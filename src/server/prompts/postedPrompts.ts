import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PromptCategory } from "@/data/prompts";
import type { PromptView } from "@/lib/promptView";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { create_public_supabase } from "@/server/supabase/publicClient";

/** Cache tags: every posted prompt, and one prompt by slug. Updated by the create action. */
export const POSTED_PROMPTS_TAG = "posted-prompts";
export function get_posted_prompt_tag(slug: string): string {
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
}

const DETAIL_COLUMNS =
  "slug, file_name, author_handle, title, tagline, summary, category, meant_for, highlights, usage_steps, works_with, content, preview_line_count";

/** Lines of a file the way an editor counts them (a final newline doesn't add one). */
export function split_file_lines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
}

function to_prompt_view(row: PostedPromptRow): PromptView {
  const lines = split_file_lines(row.content);

  return {
    slug: row.slug,
    fileName: row.file_name,
    category: row.category,
    author: row.author_handle,
    // Posting is free for now; paid posts arrive with checkout.
    priceUsd: 0,
    lineCount: lines.length,
    worksWith: row.works_with,
    excerpt: lines.slice(0, row.preview_line_count).join("\n"),
    outputExamples: [],
    title: row.title,
    tagline: row.tagline,
    summary: row.summary,
    highlights: row.highlights,
    meantFor: row.meant_for,
    usageSteps: row.usage_steps,
    fullMarkdown: row.content,
  };
}

/**
 * A posted prompt by slug, or null. Cached until a new post updates its tag; a failed query
 * throws instead of returning null, so an outage is never cached as "not found".
 */
export async function get_posted_prompt(slug: string): Promise<PromptView | null> {
  "use cache";
  cacheTag(POSTED_PROMPTS_TAG, get_posted_prompt_tag(slug));
  cacheLife("hours");

  const supabase = create_public_supabase();
  if (!supabase || !SLUG_PATTERN.test(slug)) return null;

  const { data, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<PostedPromptRow>();
  if (error) throw new Error(`Couldn't load posted prompt "${slug}": ${error.message}`);
  return data ? to_prompt_view(data) : null;
}
