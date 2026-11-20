import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { RatingForm } from "@/components/prompt-detail/RatingForm/RatingForm";
import { SecondaryButton } from "@/components/shared/SecondaryButton/SecondaryButton";
import { get_my_rating } from "@/server/ratings/myRating";
import styles from "./PromptRatings.module.css";

/**
 * The visitor's part of the Ratings section: the form for readers, a sign-in link for visitors,
 * a note for the post's authors and for posts not approved yet. Reads the session, so it renders
 * inside its own <Suspense>: the rest of the page stays cached and shared.
 */
export async function PromptRatings({ slug }: { slug: string }): Promise<ReactElement> {
  const t = await getTranslations("promptDetail.ratings");
  const my_rating = await get_my_rating(slug);

  if (!my_rating) return <p className={styles.note}>{t("notApproved")}</p>;
  if (my_rating.state === "author") return <p className={styles.note}>{t("author")}</p>;
  if (my_rating.state === "signedOut") {
    return (
      <div className={styles.signIn}>
        <p className={styles.note}>{t("signInNote")}</p>
        <SecondaryButton href={{ pathname: "/login", query: { next: `/prompts/${slug}#ratings` } }}>
          {t("signIn")}
        </SecondaryButton>
      </div>
    );
  }
  return <RatingForm slug={slug} saved_stars={my_rating.stars} />;
}
