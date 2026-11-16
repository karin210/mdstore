import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { get_review_access } from "@/server/reviews/reviewData";
import styles from "./AuthorBar.module.css";

/**
 * On a live posted prompt, a bar for its authors and the admins that leads to its review. Reads
 * the session, so it renders inside its own <Suspense>: the rest of the page stays cacheable.
 */
export async function AuthorBar({ slug }: { slug: string }): Promise<ReactElement | null> {
  const access = await get_review_access(slug);
  if (!access) return null;
  const t = await getTranslations("promptDetail.authorBar");

  return (
    <p className={styles.bar}>
      <span>{t(access)}</span>
      <Link className={styles.link} href={`/prompts/${slug}/review`}>
        {t("action")}
      </Link>
    </p>
  );
}
