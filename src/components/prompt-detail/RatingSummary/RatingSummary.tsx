import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { RatingStars } from "@/components/shared/RatingStars/RatingStars";
import type { PromptRating } from "@/lib/rating";
import styles from "./RatingSummary.module.css";

interface RatingSummaryProps {
  rating: PromptRating;
  size?: "small" | "large";
}

/** A post's public rating: stars, the mean out of 5 and how many readers rated it. */
export async function RatingSummary({ rating, size = "small" }: RatingSummaryProps): Promise<ReactElement> {
  const t = await getTranslations("promptDetail.ratings");
  const format = await getFormatter();

  if (rating.count === 0) {
    return (
      <p className={styles.summary} data-size={size}>
        <RatingStars average={0} size={size} />
        <span className={styles.muted}>{t("none")}</span>
      </p>
    );
  }

  const average = format.number(rating.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <p className={styles.summary} data-size={size}>
      <RatingStars average={rating.average} size={size} />
      <span>
        <strong className={styles.average}>{t("average", { average })}</strong>{" "}
        <span className={styles.muted}>{t("count", { count: rating.count })}</span>
      </span>
    </p>
  );
}
