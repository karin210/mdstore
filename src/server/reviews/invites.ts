import "server-only";
import { createServerSupabase } from "@/server/supabase/serverClient";

export interface PostInvite {
  slug: string;
  title: string;
  invite_state: "valid" | "used" | "expired";
}

/** Invite tokens are 24 random bytes in hex; anything else can't be one. */
export const INVITE_TOKEN_PATTERN = /^[0-9a-f]{48}$/;

/**
 * What an invite link points to, read as the signed-in visitor, or null for an unknown token
 * (or when nobody is signed in). Uncached: it reads the session.
 */
export async function get_post_invite(token: string): Promise<PostInvite | null> {
  if (!INVITE_TOKEN_PATTERN.test(token)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  // A set-returning function: one row, or none for an unknown token.
  const { data, error } = await supabase.rpc("get_post_invite", { p_token: token }).maybeSingle<PostInvite>();
  if (error) throw new Error(`Couldn't load the invite: ${error.message}`);
  return data ?? null;
}
