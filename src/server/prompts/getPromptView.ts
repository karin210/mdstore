import "server-only";
import { getTranslations } from "next-intl/server";
import { findPromptBySlug, isFree, type PromptListing } from "@/data/prompts";
import { messageList } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { readPromptMarkdown } from "@/lib/promptFiles";
import type { PromptView } from "@/lib/promptView";
import { get_posted_prompt } from "@/server/prompts/postedPrompts";

/** A catalogue listing with its copy from the message catalogue (current locale unless given). */
async function get_catalogue_prompt_view(listing: PromptListing, locale?: Locale): Promise<PromptView> {
  const namespace = `prompts.listings.${listing.slug}` as const;
  const t = locale ? await getTranslations({ locale, namespace }) : await getTranslations(namespace);
  // Only free files are read: a paid file's content must never reach the page's HTML.
  const full_markdown = isFree(listing) ? await readPromptMarkdown(listing.fileName) : null;

  return {
    ...listing,
    title: t("title"),
    tagline: t("tagline"),
    summary: t("summary"),
    highlights: messageList(t.raw("highlights")),
    meantFor: messageList(t.raw("meantFor")),
    usageSteps: messageList(t.raw("usageSteps")),
    fullMarkdown: full_markdown,
  };
}

/** The prompt shown at /prompts/[slug]: a catalogue listing first, then a posted prompt; null if neither. */
export async function get_prompt_view(slug: string, locale?: Locale): Promise<PromptView | null> {
  const listing = findPromptBySlug(slug);
  if (listing) return get_catalogue_prompt_view(listing, locale);
  return get_posted_prompt(slug);
}
