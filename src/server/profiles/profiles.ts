import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { createServerSupabase } from "@/server/supabase/serverClient";

export const PROFILES_TABLE = "profiles";

export interface SignedInProfile {
  user_id: string;
  email: string | null;
  /** Null for accounts created before usernames existed; they pick one before posting. */
  username: string | null;
}

/**
 * The signed-in visitor with their @username, or null when nobody is signed in. Uncached: it reads
 * the session. A failed lookup throws, so an outage never looks like "no username yet".
 */
export async function get_signed_in_profile(): Promise<SignedInProfile | null> {
  const user = await getSignedInUser();
  if (!user) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle<{ username: string }>();
  if (error) throw new Error(`Couldn't load the profile: ${error.message}`);
  return { user_id: user.id, email: user.email, username: data?.username ?? null };
}

/** Whether a username is free, ignoring case (usernames are public, so any client can ask). */
export async function is_username_taken(supabase: SupabaseClient, username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(PROFILES_TABLE)
    .select("user_id", { count: "exact", head: true })
    .ilike("username", username.replace(/[\\%_]/g, "\\$&"));
  if (error) throw new Error(`Couldn't check the username: ${error.message}`);
  return (count ?? 0) > 0;
}
