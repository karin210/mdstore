import "server-only";
import { create_server_supabase } from "@/server/supabase/serverClient";

export interface SignedInUser {
  id: string;
  email: string | null;
}

/**
 * The visitor's verified identity, or null when nobody is signed in (or Supabase isn't configured).
 * Uses getClaims(), which checks the token's signature, never the unverified session cookie.
 */
export async function get_signed_in_user(): Promise<SignedInUser | null> {
  const supabase = await create_server_supabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
}
