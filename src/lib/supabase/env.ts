/**
 * Public Supabase settings, read once. Both are safe to expose to the browser: the publishable key
 * only grants what the database's row-level security policies allow.
 * The `process.env.NEXT_PUBLIC_*` reads must stay literal so Next.js inlines them in client bundles.
 */
export interface SupabaseEnv {
  url: string;
  publishable_key: string;
}

/** The Supabase settings, or null while the project isn't configured (e.g. a build without `.env.local`). */
export function get_supabase_env(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable_key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishable_key) return null;
  return { url, publishable_key };
}
