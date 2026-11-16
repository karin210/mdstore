import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { PickUsernameForm } from "@/components/global/PickUsernameForm";
import { AuthorsPanel } from "@/components/review/AuthorsPanel";
import { CommentForm } from "@/components/review/CommentForm";
import { DecisionForm } from "@/components/review/DecisionForm";
import { review_href, REVIEW_TABS, type ReviewTab } from "@/components/review/reviewHref";
import { RevisionChanges } from "@/components/review/RevisionChanges";
import { RevisionFile } from "@/components/review/RevisionFile";
import { ReviewTimeline } from "@/components/review/ReviewTimeline";
import { WithdrawButton } from "@/components/review/WithdrawButton";
import { PostPromptForm } from "@/components/upload/PostPromptForm";
import { Link } from "@/i18n/navigation";
import { get_review_revisions } from "@/lib/review/reviewView";
import { is_review_active, type Review, type Revision } from "@/lib/review/types";
import { splitFileLines } from "@/lib/splitFileLines";
import { get_review_page } from "@/server/reviews/reviewData";
import styles from "./Review.module.css";

interface ReviewBodyProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function read_number(value: string | string[] | undefined): number | undefined {
  const number = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function read_tab(value: string | string[] | undefined): ReviewTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return (REVIEW_TABS as readonly string[]).includes(tab ?? "") ? (tab as ReviewTab) : "conversation";
}

/** Everything on /prompts/[slug]/review that depends on the URL and the visitor's session. */
export async function ReviewBody({ params, searchParams }: ReviewBodyProps): Promise<ReactElement> {
  const { slug } = await params;
  const query = await searchParams;
  const data = await get_review_page(slug);
  if (!data) notFound();

  const t = await getTranslations("review");
  const format = await getFormatter();
  const format_date = (iso: string): string =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
  const name_of = (user_id: string | null): string => (user_id && data.usernames[user_id]) || t("timeline.someone");

  const { post, viewer } = data;
  const latest_review = data.reviews[data.reviews.length - 1];
  const review: Review =
    data.reviews.find((candidate) => candidate.number === read_number(query.review)) ?? latest_review;
  const is_latest = review.id === latest_review.id;
  const is_active = is_review_active(review.status);
  const review_revisions = get_review_revisions(review, data.revisions);
  const latest_revision_of_post: Revision = data.revisions[data.revisions.length - 1];
  const selected_revision: Revision =
    review_revisions.find((revision) => revision.number === read_number(query.revision)) ??
    review_revisions[review_revisions.length - 1];

  const is_author = viewer.role !== null;
  const can_take_part = is_author || viewer.is_admin;
  // Authors push to the review in progress, or open a new one on an approved post; closed posts take none.
  const can_revise = is_author && is_latest && post.status !== "rejected" && post.status !== "withdrawn";
  const requested_tab = read_tab(query.tab);
  const tab: ReviewTab = requested_tab === "revise" && !can_revise ? "conversation" : requested_tab;
  const is_first_review = review.base_revision_id === null && review.number === 1;
  const tabs: ReviewTab[] = can_revise ? [...REVIEW_TABS] : ["conversation", "file", "changes"];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label={t("breadcrumb.label")}>
        <ol>
          <li>
            {viewer.is_admin && !is_author ? (
              <Link href="/reviews">{t("breadcrumb.queue")}</Link>
            ) : (
              <Link href={{ pathname: "/upload", hash: "my-submissions-title" }}>{t("breadcrumb.submissions")}</Link>
            )}
          </li>
          <li>
            <span aria-current="page">{post.slug}</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <p className="eyebrow">
          {t("eyebrow", { number: review.number })} · {t(is_first_review ? "kindOf.first" : "kindOf.update")}
        </p>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.meta}>
          <span className={styles.status} data-status={review.status}>
            {t(`status.${review.status}`)}
          </span>
          <span>
            {review.opened_by
              ? t("openedBy", { username: name_of(review.opened_by), date: format_date(review.created_at) })
              : t("openedOn", { date: format_date(review.created_at) })}
          </span>
          <span className={styles.postStatus} data-status={post.status}>
            {t(`postStatus.${post.status}`)}
          </span>
          {post.status === "approved" && (
            <Link className={styles.inlineLink} href={`/prompts/${post.slug}`}>
              {t("viewPage")}
            </Link>
          )}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.content}>
          <nav aria-label={t("tabs.label")}>
            <ul className={styles.tabs}>
              {tabs.map((tab_name) => (
                <li key={tab_name}>
                  <Link
                    className={styles.tab}
                    href={review_href(post.slug, {
                      review: is_latest ? undefined : review.number,
                      tab: tab_name,
                      revision: tab_name === "file" || tab_name === "changes" ? selected_revision.number : undefined,
                    })}
                    aria-current={tab === tab_name ? "page" : undefined}
                  >
                    {t(`tabs.${tab_name}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {(tab === "file" || tab === "changes") && review_revisions.length > 1 && (
            <nav aria-label={t("file.revisionsLabel")}>
              <ul className={styles.revisionPicker}>
                {review_revisions.map((revision, index) => (
                  <li key={revision.id}>
                    <Link
                      className={styles.chip}
                      href={review_href(post.slug, {
                        review: is_latest ? undefined : review.number,
                        tab,
                        revision: revision.number,
                      })}
                      aria-current={revision.id === selected_revision.id ? "page" : undefined}
                    >
                      {t("file.revision", { number: revision.number })}
                      {index === review_revisions.length - 1 && ` (${t("file.latest")})`}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {tab === "conversation" && (
            <section className={styles.panel} aria-label={t("timeline.label")}>
              <ReviewTimeline
                slug={post.slug}
                review={review}
                is_latest={is_latest}
                revisions={data.revisions}
                comments={data.comments}
                name_of={name_of}
                format_date={format_date}
              />
              {can_take_part && is_active && !viewer.username && (
                <div className={styles.card}>
                  <p className={styles.muted}>{t("pickUsername")}</p>
                  <PickUsernameForm />
                </div>
              )}
              {viewer.is_admin && is_active && viewer.username && (
                <DecisionForm
                  review_id={review.id}
                  slug={post.slug}
                  latest_revision_number={review_revisions[review_revisions.length - 1].number}
                  is_first_review={is_first_review}
                />
              )}
              {can_take_part && is_active && viewer.username && <CommentForm review_id={review.id} />}
              {!is_active && <p className={styles.muted}>{t("comment.closed")}</p>}
            </section>
          )}

          {tab === "file" && (
            <section className={styles.panel} aria-label={t("file.revision", { number: selected_revision.number })}>
              <p className={styles.muted}>
                {t("file.pushedBy", {
                  username: name_of(selected_revision.created_by),
                  date: format_date(selected_revision.created_at),
                })}
              </p>
              <RevisionFile
                review_id={review.id}
                revision_id={selected_revision.id}
                file_name={selected_revision.file_name}
                lines={splitFileLines(selected_revision.content)}
                comments={data.comments
                  .filter((comment) => comment.revision_id === selected_revision.id && comment.line_number !== null)
                  .map((comment) => ({
                    id: comment.id,
                    line_number: comment.line_number ?? 0,
                    username: name_of(comment.author_id),
                    body: comment.body ?? "",
                    date: format_date(comment.created_at),
                  }))}
                can_comment={can_take_part && is_active && viewer.username !== null}
              />
            </section>
          )}

          {tab === "changes" && (
            <section className={styles.panel} aria-label={t("tabs.changes")}>
              <RevisionChanges revision={selected_revision} review={review} revisions={data.revisions} />
            </section>
          )}

          {tab === "revise" && (
            <section className={styles.panel} aria-label={t("tabs.revise")}>
              <p className={styles.muted}>
                {is_active
                  ? t("revise.intoActive", { number: review.number })
                  : t("revise.newReview", { number: latest_review.number + 1 })}
              </p>
              <div className={styles.card}>
                <PostPromptForm
                  mode="revision"
                  post_id={post.id}
                  slug={post.slug}
                  current_file_name={latest_revision_of_post.file_name}
                  initial_values={{
                    kind: latest_revision_of_post.kind,
                    title: latest_revision_of_post.title,
                    tagline: latest_revision_of_post.tagline,
                    summary: latest_revision_of_post.summary,
                    category: latest_revision_of_post.category,
                    meantFor: latest_revision_of_post.meant_for.join("\n"),
                    highlights: latest_revision_of_post.highlights.join("\n"),
                    usageSteps: latest_revision_of_post.usage_steps.join("\n"),
                    worksWith: latest_revision_of_post.works_with,
                    previewLineCount: String(latest_revision_of_post.preview_line_count),
                  }}
                />
              </div>
            </section>
          )}
        </div>

        <aside className={styles.sidebar}>
          {data.reviews.length > 1 && (
            <section className={styles.card} aria-labelledby="review-history-title">
              <h2 id="review-history-title" className={styles.cardTitle}>
                {t("history.title")}
              </h2>
              <ol className={styles.history}>
                {[...data.reviews].reverse().map((item) => (
                  <li key={item.id}>
                    {item.id === review.id ? (
                      <span aria-current="page">
                        {t("history.item", { number: item.number, status: t(`status.${item.status}`) })} ·{" "}
                        {t("history.current")}
                      </span>
                    ) : (
                      <Link
                        href={review_href(post.slug, {
                          review: item.id === latest_review.id ? undefined : item.number,
                        })}
                      >
                        {t("history.item", { number: item.number, status: t(`status.${item.status}`) })}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <AuthorsPanel
            post_id={post.id}
            slug={post.slug}
            authors={data.authors}
            viewer_user_id={viewer.user_id}
            viewer_role={viewer.role}
          />

          {viewer.role === "owner" && is_active && (
            <WithdrawButton review_id={review.id} is_first_review={is_first_review} />
          )}
        </aside>
      </div>
    </div>
  );
}
