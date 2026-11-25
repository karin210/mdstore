import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { AuthorBar } from "@/components/prompt-detail/AuthorBar/AuthorBar";
import { PromptListing } from "@/components/prompt-detail/PromptListing/PromptListing";
import { PromptRatings } from "@/components/prompt-detail/PromptRatings/PromptRatings";
import { RatingSummary } from "@/components/prompt-detail/RatingSummary/RatingSummary";
import { Link } from "@/i18n/navigation";
import { getPromptOrNotFound } from "@/lib/getPromptOrNotFound";
import styles from "@/components/prompt-detail/shared/PromptDetail.module.css";

interface PromptDetailProps {
  /** The route's params promise, awaited here so the read happens inside the page's <Suspense>. */
  params: Promise<{ slug: string }>;
}

/**
 * Everything on /prompts/[slug] that depends on the listing in the URL: the breadcrumb, the review
 * notice or author bar, and the listing itself (PromptListing, shared with the upload preview).
 */
export async function PromptDetail({ params }: PromptDetailProps): Promise<ReactElement> {
  const prompt = await getPromptOrNotFound(params);
  const t = await getTranslations("promptDetail");
  const tPrompts = await getTranslations("prompts");

  return (
    <>
      <nav className={styles.breadcrumb} aria-label={t("breadcrumb.label")}>
        <ol>
          <li>
            <Link href={{ pathname: "/", hash: "featured" }}>{t("breadcrumb.prompts")}</Link>
          </li>
          <li>
            <span aria-current="page">{prompt.fileName}</span>
          </li>
        </ol>
      </nav>

      {prompt.reviewStatus ? (
        <p className={styles.reviewNotice} data-status={prompt.reviewStatus} role="status">
          {t(`reviewNotice.${prompt.reviewStatus}`)}
          <Link className={styles.reviewLink} href={`/prompts/${prompt.slug}/review`}>
            {t("reviewNotice.openReview")}
          </Link>
        </p>
      ) : (
        prompt.isPosted && (
          // Only this bar reads the session; the listing itself stays cached and shared.
          <Suspense fallback={null}>
            <AuthorBar slug={prompt.slug} />
          </Suspense>
        )
      )}

      <PromptListing
        prompt={prompt}
        category_label={tPrompts(`categories.${prompt.category}`)}
        ratings={
          prompt.rating ? (
            <>
              <RatingSummary rating={prompt.rating} size="large" />
              {/* Only this part reads the session; the listing itself stays cached and shared. */}
              <Suspense fallback={null}>
                <PromptRatings slug={prompt.slug} />
              </Suspense>
            </>
          ) : (
            <p className={styles.note}>{t("ratings.catalogue")}</p>
          )
        }
      />
    </>
  );
}
