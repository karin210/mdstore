/**
 * Public Supabase settings, read once. Both are safe to expose to the browser: the publishable key
 * only grants what the database's row-level security policies allow.
 * The `process.env.NEXT_PUBLIC_*` reads must stay literal so Next.js inlines them in client bundles.
 */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

/** The Supabase settings, or null while the project isn't configured (e.g. a build without `.env.local`). */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
