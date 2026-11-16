import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { get_review_queue } from "@/server/reviews/reviewQueue";
import styles from "@/components/review/shared/Review.module.css";

/** Reviews in progress for admins: waiting for a decision first, then waiting on their authors. */
export async function ReviewQueue(): Promise<ReactElement> {
  const queue = await get_review_queue();
  if (!queue) notFound();
  const t = await getTranslations("review");
  const format = await getFormatter();

  return (
    <section className={styles.page} aria-labelledby="queue-title">
      <header className={styles.header}>
        <p className="eyebrow">{t("queue.eyebrow")}</p>
        <h1 id="queue-title" className={styles.title}>
          {t("queue.title")}
        </h1>
        <p className={styles.muted}>{t("queue.lead")}</p>
      </header>
      {queue.length === 0 ? (
        <p className={styles.muted}>{t("queue.empty")}</p>
      ) : (
        <ol className={styles.timeline}>
          {queue.map((item) => (
            <li key={`${item.post.slug}-${item.number}`} className={styles.event}>
              <p className={styles.eventHeader}>
                <Link className={styles.inlineLink} href={`/prompts/${item.post.slug}/review`}>
                  {item.post.title}
                </Link>
                <span className={styles.status} data-status={item.status}>
                  {t(`status.${item.status}`)}
                </span>
              </p>
              <p className={styles.muted}>
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
