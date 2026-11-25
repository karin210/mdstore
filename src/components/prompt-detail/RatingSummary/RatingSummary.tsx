import { useFormatter, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { RatingStars } from "@/components/shared/RatingStars/RatingStars";
import type { PromptRating } from "@/lib/rating";
import styles from "./RatingSummary.module.css";

interface RatingSummaryProps {
  rating: PromptRating;
  size?: "small" | "large";
}

/**
 * A post's public rating: stars, the mean out of 5 and how many readers rated it. Synchronous (hooks,
 * not `getTranslations`), so the listing page and the client-side upload preview can both render it.
 */
export function RatingSummary({ rating, size = "small" }: RatingSummaryProps): ReactElement {
  const t = useTranslations("promptDetail.ratings");
  const format = useFormatter();

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
