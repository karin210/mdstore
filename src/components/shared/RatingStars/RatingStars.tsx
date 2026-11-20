import type { CSSProperties, ReactElement } from "react";
import { StarIcon } from "@/components/shared/icons/icons";
import { rating_fill_percent, STAR_VALUES } from "@/lib/rating";
import styles from "./RatingStars.module.css";

interface RatingStarsProps {
  /** Mean stars, 0 to 5; fractions fill part of a star (4.3 fills four and a third). */
  average: number;
  size?: "small" | "large";
}

/**
 * Five stars filled up to an average, for display only. Hidden from assistive tech: the text
 * next to it carries the rating.
 */
export function RatingStars({ average, size = "small" }: RatingStarsProps): ReactElement {
  const fill = { "--rating-fill": `${rating_fill_percent(average)}%` } as CSSProperties;
  const stars = STAR_VALUES.map((value) => <StarIcon key={value} />);

  return (
    <span className={styles.stars} data-size={size} style={fill} aria-hidden="true">
      <span className={styles.empty}>{stars}</span>
      <span className={styles.filled}>{stars}</span>
    </span>
  );
}
