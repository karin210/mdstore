import "server-only";
import type { NextRequest } from "next/server";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createPublicSupabase } from "@/server/supabase/publicClient";
import { createRequestSupabase } from "@/server/supabase/requestClient";

/**
 * Whether a posted prompt exists, for src/proxy.ts (uncached: the proxy runs before rendering).
 * Answers true when the check itself fails, so the page renders and handles the error instead of
 * showing a misleading 404.
 */
export async function postedPromptExists(slug: string): Promise<boolean> {
  const supabase = createPublicSupabase();
  if (!supabase || !SLUG_PATTERN.test(slug)) return false;

  const { count, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("slug", { count: "exact", head: true })
    .eq("slug", slug);
  if (error) return true;
  return (count ?? 0) > 0;
}

/**
 * Whether the signed-in visitor of this request can see a posted prompt that is not public yet:
 * row-level security lets its author and admins read their pending and rejected posts. The proxy
 * asks this only after the public check found nothing, so the common cases cost no extra query.
 * Everyone else gets false, which rewrites to the same 404 as an unknown slug (existence of
 * pending posts doesn't leak). Answers true when the query fails, like postedPromptExists.
 */
export async function postedPromptVisibleToRequest(slug: string, request: NextRequest): Promise<boolean> {
  const supabase = createRequestSupabase(request);
  if (!supabase || !SLUG_PATTERN.test(slug)) return false;

  const { count, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("slug", { count: "exact", head: true })
    .eq("slug", slug);
  if (error) return true;
  return (count ?? 0) > 0;
}
