import "server-only";
import { createHash } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { featuredPrompts, isFree, type PromptCategory, type PromptKind } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import type { PromptView } from "@/lib/promptView";
import { to_prompt_rating, type PromptRating } from "@/lib/rating";
import { getPromptView } from "@/server/prompts/getPromptView";
import { list_posted_prompts, type PostedPromptSummaryRow } from "@/server/prompts/postedPrompts";

/**
 * What the public JSON API (src/app/api/v1/prompts) returns, mapped from the catalogue and the
 * posted prompts. The API always answers in the default locale (English). Field names match
 * PromptListing, so the site and the API describe a prompt with the same words.
 */

/** One prompt in GET /api/v1/prompts. */
export interface PromptSummary {
  slug: string;
  title: string;
  tagline: string;
  category: PromptCategory;
  kind: PromptKind;
  version: number;
  priceUsd: number;
  fileName: string;
  author: string;
  /** Readers' mean stars (one decimal) and how many rated; null for catalogue listings, which can't be rated. */
  rating: PromptRating | null;
}

/** GET /api/v1/prompts/[slug]: the summary plus what the CLI checks before and after downloading. */
export interface PromptDetails extends PromptSummary {
  /** SHA-256 (hex) of the file served by /file; null for paid prompts, whose content is never read. */
  sha256: string | null;
  worksWith: string[];
  lineCount: number;
  context_tokens: number;
}

export interface PromptListFilter {
  /** Matched case-insensitively against slug, title, tagline, file name and author. */
  q?: string;
  category?: PromptCategory;
}

const api_locale = routing.defaultLocale;

/** Hex SHA-256 of a file's UTF-8 bytes, the same bytes /file sends. Computed per request, never stored. */
export function sha256_hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function to_prompt_summary(prompt: Omit<PromptSummary, "rating"> & { rating?: PromptRating | null }): PromptSummary {
  return {
    slug: prompt.slug,
    title: prompt.title,
    tagline: prompt.tagline,
    category: prompt.category,
    kind: prompt.kind,
    version: prompt.version,
    priceUsd: prompt.priceUsd,
    fileName: prompt.fileName,
    author: prompt.author,
    rating: prompt.rating ?? null,
  };
}

function posted_row_to_summary(row: PostedPromptSummaryRow): PromptSummary {
  return {
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    category: row.category,
    kind: row.kind,
    version: row.version,
    // Posting is free for now (see toPromptView in postedPrompts.ts).
    priceUsd: 0,
    fileName: row.file_name,
    author: row.author_handle,
    rating: to_prompt_rating(row.rating_count, row.rating_sum),
  };
}

async function list_catalogue_summaries(): Promise<PromptSummary[]> {
  const t = await getTranslations({ locale: api_locale, namespace: "prompts.listings" });
  return featuredPrompts.map((listing) =>
    to_prompt_summary({ ...listing, title: t(`${listing.slug}.title`), tagline: t(`${listing.slug}.tagline`) }),
  );
}

export function matches_filter(prompt: PromptSummary, filter: PromptListFilter): boolean {
  if (filter.category && prompt.category !== filter.category) return false;
  const query = filter.q?.trim().toLowerCase();
  if (!query) return true;
  return [prompt.slug, prompt.title, prompt.tagline, prompt.fileName, prompt.author].some((field) =>
    field.toLowerCase().includes(query),
  );
}

/** Catalogue listings first (in catalogue order), then posted prompts (newest first), filtered. */
export async function list_prompt_summaries(filter: PromptListFilter): Promise<PromptSummary[]> {
  const [catalogue, posted] = await Promise.all([list_catalogue_summaries(), list_posted_prompts()]);
  return [...catalogue, ...posted.map(posted_row_to_summary)].filter((prompt) => matches_filter(prompt, filter));
}

export function to_prompt_details(prompt: PromptView): PromptDetails {
  // Only a free prompt's content is hashed; a paid one's is never read (fullMarkdown is null).
  const free_content = isFree(prompt) ? prompt.fullMarkdown : null;
  return {
    ...to_prompt_summary(prompt),
    sha256: free_content === null ? null : sha256_hex(free_content),
    worksWith: prompt.worksWith,
    lineCount: prompt.lineCount,
    context_tokens: prompt.context_tokens,
  };
}

/** A prompt (catalogue first, then posted) in the API's locale, or null when the slug is unknown. */
export function get_api_prompt_view(slug: string): Promise<PromptView | null> {
  return getPromptView(slug, api_locale);
}

/** The API's error messages (English, like the rest of the API). */
export const api_messages = {
  invalid_query: "The query parameters are invalid.",
  not_found: "This prompt doesn't exist.",
  paid: "This prompt is paid. Paid prompts can't be downloaded from the API yet.",
  server_error: "Something went wrong on our side. Please try again in a moment.",
} as const;

/** A JSON error body with its status, the shape every /api/v1 error uses. */
export function api_error(status: number, message: string, request_id?: string): Response {
  return Response.json(request_id ? { status, message, requestId: request_id } : { status, message }, { status });
}
