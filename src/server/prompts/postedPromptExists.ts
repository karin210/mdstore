import "server-only";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { create_public_supabase } from "@/server/supabase/publicClient";

/**
 * Whether a posted prompt exists, for src/proxy.ts (uncached: the proxy runs before rendering).
 * Answers true when the check itself fails, so the page renders and handles the error instead of
 * showing a misleading 404.
 */
export async function posted_prompt_exists(slug: string): Promise<boolean> {
  const supabase = create_public_supabase();
  if (!supabase || !SLUG_PATTERN.test(slug)) return false;

  const { count, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("slug", { count: "exact", head: true })
    .eq("slug", slug);
  if (error) return true;
  return (count ?? 0) > 0;
}
