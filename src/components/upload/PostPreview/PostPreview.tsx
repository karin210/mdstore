"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, type ReactElement } from "react";
import { PromptDetailSkeleton } from "@/components/prompt-detail/PromptDetailSkeleton/PromptDetailSkeleton";
import { PromptListing } from "@/components/prompt-detail/PromptListing/PromptListing";
import { RatingSummary } from "@/components/prompt-detail/RatingSummary/RatingSummary";
import { SecondaryButton } from "@/components/shared/SecondaryButton/SecondaryButton";
import { build_preview_listing } from "@/lib/postPreview";
import { INITIAL_PREVIEW_STATE, PostPreviewReceiver, type PostPreviewState } from "@/lib/PostPreviewReceiver";
import detail_styles from "@/components/prompt-detail/shared/PromptDetail.module.css";
import styles from "./PostPreview.module.css";

/** The server render has no form to listen to: it shows the waiting skeleton. */
function get_server_state(): PostPreviewState {
  return INITIAL_PREVIEW_STATE;
}

/**
 * The live preview of the upload form (/upload/preview): the listing exactly as /prompts/[slug] will show it,
 * built from the form open in another tab and updated as the author types (PostPreviewReceiver does the
 * listening). Shows a skeleton while waiting for a form and an invitation to open one when none answers.
 */
export function PostPreview(): ReactElement {
  const t = useTranslations("upload.preview");
  const t_detail = useTranslations("promptDetail");
  const t_categories = useTranslations("prompts.categories");
  const [receiver] = useState(() => new PostPreviewReceiver());
  const { status, snapshot, file, image_urls } = useSyncExternalStore(
    receiver.subscribe,
    receiver.get_state,
    get_server_state,
  );

  useEffect(() => {
    receiver.start();
    return () => receiver.stop();
  }, [receiver]);

  if (!snapshot) {
    if (status === "waiting") return <PromptDetailSkeleton />;
    return (
      <section className={styles.empty} aria-labelledby="preview-empty-title">
        <h1 id="preview-empty-title" className={styles.emptyTitle}>
          {t("noForm.title")}
        </h1>
        <p className={styles.emptyText}>{t("noForm.text")}</p>
        <SecondaryButton href={{ pathname: "/upload", hash: "post-prompt" }}>{t("noForm.action")}</SecondaryButton>
      </section>
    );
  }

  const { prompt, category, empty_fields } = build_preview_listing({ snapshot, file, image_urls });
  const is_closed = status === "closed";

  return (
    <>
      <p className={styles.banner} data-state={is_closed ? "closed" : "live"} role="status">
        {is_closed ? t("banner.closed") : t("banner.live")}
      </p>
      <PromptListing
        prompt={prompt}
        category_label={category ? t_categories(category) : ""}
        is_preview
        empty_fields={empty_fields}
        ratings={
          <>
            <RatingSummary rating={{ average: 0, count: 0 }} size="large" />
            <p className={detail_styles.note}>{t_detail("ratings.notApproved")}</p>
          </>
        }
      />
    </>
  );
}
