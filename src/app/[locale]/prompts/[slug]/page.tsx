import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { PromptDetail } from "@/components/prompt-detail/PromptDetail";
import { PromptDetailSkeleton } from "@/components/prompt-detail/PromptDetailSkeleton";
import { featuredPrompts } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import { getPromptOrNotFound } from "@/lib/getPromptOrNotFound";
import styles from "./page.module.css";

/**
 * Catalogue listings are known at build time, so their pages are prerendered in every locale.
 * Prompts posted by users render on their first request (their data is cached, see postedPrompts.ts).
 */
export function generateStaticParams(): { locale: string; slug: string }[] {
  return routing.locales.flatMap((locale) => featuredPrompts.map((prompt) => ({ locale, slug: prompt.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/prompts/[slug]">): Promise<Metadata> {
  const prompt = await getPromptOrNotFound(params);
  const tDetail = await getTranslations("promptDetail.meta");

  return {
    title: tDetail("title", { title: prompt.title, fileName: prompt.fileName }),
    description: prompt.summary,
  };
}

/**
 * The page itself never awaits `params`: the URL-specific content reads it inside <Suspense>,
 * so the shell shared by every listing can be prefetched and shown instantly on navigation.
 */
export default function PromptDetailPage({ params }: PageProps<"/[locale]/prompts/[slug]">): ReactElement {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PromptDetailSkeleton />}>
        <PromptDetail params={params} />
      </Suspense>
    </main>
  );
}
