import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";
import { PromptDetail } from "@/components/prompt-detail/PromptDetail";
import { PromptDetailSkeleton } from "@/components/prompt-detail/PromptDetailSkeleton";
import { featuredPrompts } from "@/data/prompts";
import { getPromptOrNotFound } from "@/lib/getPromptOrNotFound";
import styles from "./page.module.css";

/** Every listing is known at build time, so each detail page is prerendered. */
export function generateStaticParams(): { slug: string }[] {
  return featuredPrompts.map((prompt) => ({ slug: prompt.slug }));
}

export async function generateMetadata({ params }: PageProps<"/prompts/[slug]">): Promise<Metadata> {
  const prompt = await getPromptOrNotFound(params);

  return {
    title: `${prompt.title} (${prompt.fileName})`,
    description: prompt.summary,
  };
}

/**
 * The page itself never awaits `params`: the URL-specific content reads it inside <Suspense>,
 * so the shell shared by every listing can be prefetched and shown instantly on navigation.
 */
export default function PromptDetailPage({ params }: PageProps<"/prompts/[slug]">): ReactElement {
  return (
    <main className={styles.main}>
      <Suspense fallback={<PromptDetailSkeleton />}>
        <PromptDetail params={params} />
      </Suspense>
    </main>
  );
}
