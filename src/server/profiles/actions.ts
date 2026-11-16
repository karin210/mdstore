"use server";

import { username_schema, type UsernameGuidanceKey } from "@/lib/validation/username";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { logServerError } from "@/server/logServerError";
import { is_username_taken, PROFILES_TABLE } from "@/server/profiles/profiles";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type SetUsernameResult =
  | { status: "saved" }
  | { status: "invalid"; guidance_key: UsernameGuidanceKey | "usernameTaken" }
  | { status: "error"; error_key: "unauthenticated" | "notConfigured" | "alreadySet" | "server"; request_id?: string };

const UNIQUE_VIOLATION = "23505";

/** Saves the signed-in user's @username, once (usernames can't be changed yet). */
export async function set_username(username_raw: string): Promise<SetUsernameResult> {
  const parsed = username_schema.safeParse(username_raw);
  if (!parsed.success) {
    return { status: "invalid", guidance_key: parsed.error.issues[0].message as UsernameGuidanceKey };
  }

  const user = await getSignedInUser();
  if (!user) return { status: "error", error_key: "unauthenticated" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  try {
    if (await is_username_taken(supabase, parsed.data)) return { status: "invalid", guidance_key: "usernameTaken" };

    // Row-level security only accepts the caller's own row.
    const { error } = await supabase.from(PROFILES_TABLE).insert({ user_id: user.id, username: parsed.data });
    if (error?.code === UNIQUE_VIOLATION) {
      // Either the name was taken a moment ago, or this account already has one (primary key).
      const { count } = await supabase
        .from(PROFILES_TABLE)
        .select("user_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return (count ?? 0) > 0
        ? { status: "error", error_key: "alreadySet" }
        : { status: "invalid", guidance_key: "usernameTaken" };
    }
    if (error)
      return { status: "error", error_key: "server", request_id: logServerError("profiles.setUsername", error) };
  } catch (error) {
    return { status: "error", error_key: "server", request_id: logServerError("profiles.setUsername", error) };
  }
  return { status: "saved" };
}
