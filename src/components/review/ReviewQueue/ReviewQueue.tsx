import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { get_review_queue } from "@/server/reviews/reviewQueue";
import review_page_styles from "@/styles/reviewPage.module.css";
import review_styles from "@/styles/review.module.css";
import section_styles from "@/styles/section.module.css";

/** Reviews in progress for admins: waiting for a decision first, then waiting on their authors. */
export async function ReviewQueue(): Promise<ReactElement> {
  const queue = await get_review_queue();
  if (!queue) notFound();
  const t = await getTranslations("review");
  const format = await getFormatter();

  return (
    <section className={review_page_styles.page} aria-labelledby="queue-title">
      <header className={review_page_styles.header}>
        <p className={section_styles.eyebrow}>{t("queue.eyebrow")}</p>
        <h1 id="queue-title" className={review_page_styles.title}>
          {t("queue.title")}
        </h1>
        <p className={review_styles.muted}>{t("queue.lead")}</p>
      </header>
      {queue.length === 0 ? (
        <p className={review_styles.muted}>{t("queue.empty")}</p>
      ) : (
        <ol className={review_styles.timeline}>
          {queue.map((item) => (
            <li key={`${item.post.slug}-${item.number}`} className={review_styles.event}>
              <p className={review_styles.eventHeader}>
                <Link className={review_styles.inlineLink} href={`/prompts/${item.post.slug}/review`}>
                  {item.post.title}
                </Link>
                <span className={review_styles.status} data-status={item.status}>
                  {t(`status.${item.status}`)}
                </span>
              </p>
              <p className={review_styles.muted}>
                {t(item.post.status === "approved" ? "queue.kind.update" : "queue.kind.first")} ·{" "}
                {t("queue.item", {
                  number: item.number,
                  date: format.dateTime(new Date(item.created_at), { dateStyle: "medium", timeZone: "UTC" }),
                })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
