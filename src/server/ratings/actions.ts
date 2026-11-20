"use server";

import { updateTag } from "next/cache";
import { stars_schema } from "@/lib/rating";
import { logServerError } from "@/server/logServerError";
import { getPostedPromptTag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

/** What went wrong, as a key under `promptDetail.ratings.errors` in the message catalogue. */
export type RatingErrorKey = "unauthenticated" | "forbidden" | "notFound" | "invalid" | "notConfigured" | "server";

export type RatePromptResult =
  { status: "saved"; stars: number | null } | { status: "error"; error_key: RatingErrorKey; request_id?: string };

/** The SQLSTATE codes rate_prompt() raises (see the ratings migration). */
const ERROR_KEYS_BY_CODE: Record<string, RatingErrorKey> = {
  MD401: "unauthenticated",
  MD403: "forbidden",
  MD404: "notFound",
  MD422: "invalid",
  // Postgres' own "permission denied": a signed-out call to a function only signed-in users may run.
  "42501": "unauthenticated",
};

/**
 * Saves the signed-in reader's stars (1 to 5) on an approved post, or removes them with null.
 * rate_prompt() checks the caller, the post and the stars, and updates the post's totals.
 */
export async function rate_prompt(slug: string, stars_raw: number | null): Promise<RatePromptResult> {
  const parsed = stars_schema.safeParse(stars_raw);
  if (!parsed.success || !SLUG_PATTERN.test(slug)) return { status: "error", error_key: "invalid" };

  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  try {
    const { error } = await supabase.rpc("rate_prompt", { p_slug: slug, p_stars: parsed.data });
    if (error) {
      const error_key = ERROR_KEYS_BY_CODE[error.code];
      if (error_key) return { status: "error", error_key };
      return { status: "error", error_key: "server", request_id: logServerError("rate_prompt", error) };
    }
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("rate_prompt", error) };
  }

  // The cached post (its page) and the API's list both show the totals.
  updateTag(getPostedPromptTag(slug));
  updateTag(POSTED_PROMPTS_TAG);
  return { status: "saved", stars: parsed.data };
}
