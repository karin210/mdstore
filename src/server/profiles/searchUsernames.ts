"use server";

import { normalize_username, USERNAME_SEARCH_PATTERN } from "@/lib/validation/username";
import { logServerError } from "@/server/logServerError";
import { get_signed_in_profile, PROFILES_TABLE } from "@/server/profiles/profiles";
import { createServerSupabase } from "@/server/supabase/serverClient";

const MAX_RESULTS = 8;

export type UsernameSearchResult =
  | { status: "ok"; usernames: string[] }
  | { status: "error"; error_key: "unauthenticated" | "notConfigured" | "server"; request_id?: string };

/**
 * Usernames containing the search, for picking co-authors on the upload form; the searcher's own name is left
 * out. Usernames are already public (bylines, the profiles table's select policy), so a search reveals nothing
 * new; it still needs a signed-in user, since only they can name co-authors. A search that can't be a piece of
 * a username returns no matches instead of an error.
 */
export async function search_usernames(query_raw: string): Promise<UsernameSearchResult> {
  const query = normalize_username(String(query_raw));
  if (!USERNAME_SEARCH_PATTERN.test(query)) return { status: "ok", usernames: [] };

  try {
    const profile = await get_signed_in_profile();
    if (!profile) return { status: "error", error_key: "unauthenticated" };
    const supabase = await createServerSupabase();
    if (!supabase) return { status: "error", error_key: "notConfigured" };

    // `_` is a wildcard in LIKE patterns; the pattern above already rules out `%` and `\`.
    const like_pattern = `%${query.replaceAll("_", "\\_")}%`;
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select("username")
      .ilike("username", like_pattern)
      .neq("user_id", profile.user_id)
      .order("username")
      .limit(MAX_RESULTS)
      .returns<{ username: string }[]>();
    if (error) throw error;
    return { status: "ok", usernames: data.map((row) => row.username) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.searchUsernames", error) };
  }
}
