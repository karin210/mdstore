import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { PromptDetail } from "@/components/prompt-detail/PromptDetail/PromptDetail";
import { PromptDetailSkeleton } from "@/components/prompt-detail/PromptDetailSkeleton/PromptDetailSkeleton";
import { featuredPrompts } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import { getPromptView } from "@/server/prompts/getPromptView";
import styles from "./page.module.css";

/**
 * Catalogue listings are known at build time, so their pages are prerendered in every locale.
 * Prompts posted by users render on their first request (their data is cached, see postedPrompts.ts).
 */
export function generateStaticParams(): { locale: string; slug: string }[] {
  return routing.locales.flatMap((locale) => featuredPrompts.map((prompt) => ({ locale, slug: prompt.slug })));
}

/**
 * Metadata only reads public prompts, so it never touches the visitor's session. A post still in
 * review (visible only to its author or an admin, through the page body) gets a generic title and
 * stays out of search results; the page itself renders or 404s on its own.
 */
export async function generateMetadata({ params }: PageProps<"/[locale]/prompts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPromptView(slug);
  if (!prompt) {
    const tBreadcrumb = await getTranslations("promptDetail.breadcrumb");
    return { title: tBreadcrumb("prompts"), robots: { index: false, follow: false } };
  }
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
