import "server-only";
import type { PromptView } from "@/lib/promptView";
import { DETAIL_COLUMNS, toPromptView, type PostedPromptRow } from "@/server/prompts/postedPrompts";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

type ViewerRow = PostedPromptRow & { status: "pending" | "approved" | "rejected" };

/**
 * A posted prompt that is not public yet, read as the signed-in visitor. Row-level security only
 * returns it to its author or an admin; everyone else gets null, the same as an unknown slug.
 *
 * Never cached: it reads the visitor's session, and a pending row must never reach the shared
 * cache (see "Row-level security" in docs/database.md). Call it only after the cached public read
 * found nothing. A failed query throws instead of returning null, so an outage isn't a 404.
 */
export async function getPostedPromptForViewer(slug: string): Promise<PromptView | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select(`${DETAIL_COLUMNS}, status`)
    .eq("slug", slug)
    .maybeSingle<ViewerRow>();
  if (error) throw new Error(`Couldn't load posted prompt "${slug}" for the viewer: ${error.message}`);
  if (!data) return null;

  // Approved rows are public and served by the cached read; only unpublished ones carry a status here.
  const view = toPromptView(data);
  return data.status === "approved" ? view : { ...view, reviewStatus: data.status };
}
