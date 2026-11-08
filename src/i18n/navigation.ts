import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale-aware replacements for next/link and next/navigation.
 * Always link with these: `<Link href="/prompts/global">` renders `/es/prompts/global` on the
 * Spanish site. For an in-page section pass an object (`{ pathname: "/", hash: "faq" }`); a string
 * like "/#faq" would be prefixed as "/es/#faq".
 */
export const { Link, getPathname, usePathname, useRouter, redirect } = createNavigation(routing);
