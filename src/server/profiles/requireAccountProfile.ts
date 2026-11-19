import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { get_account_profile, type AccountProfile } from "@/server/profiles/profiles";

/**
 * The signed-in account, or a redirect to /login that comes back to `return_path` afterwards.
 * src/proxy.ts already sends signed-out visitors of the account pages to /login with a real
 * redirect; this covers a session that ends between the proxy and the render (inside <Suspense>
 * it becomes a client-side redirect, see the redirect() docs).
 */
export async function require_account_profile(return_path: "/profile" | "/my-prompts"): Promise<AccountProfile> {
  const profile = await get_account_profile();
  if (profile) return profile;
  return redirect({ href: { pathname: "/login", query: { next: return_path } }, locale: await getLocale() });
}
