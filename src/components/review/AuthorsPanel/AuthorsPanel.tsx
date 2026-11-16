"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert/FormAlert";
import { getPathname, useRouter as useLocaleRouter } from "@/i18n/navigation";
import type { AuthorRole, PostAuthor } from "@/lib/review/types";
import { get_username_guidance, normalize_username } from "@/lib/validation/username";
import {
  add_post_coauthor,
  create_post_invite,
  remove_post_author,
  type ReviewErrorKey,
} from "@/server/reviews/actions";
import styles from "@/components/review/shared/Review.module.css";

interface AuthorsPanelProps {
  post_id: string;
  slug: string;
  authors: PostAuthor[];
  viewer_user_id: string;
  viewer_role: AuthorRole | null;
}

/**
 * Who wrote the post. The owner adds co-authors by @username or with a one-time invite link, and
 * removes them; a co-author can leave. Removing asks for a second press instead of a browser dialog.
 */
export function AuthorsPanel({ post_id, slug, authors, viewer_user_id, viewer_role }: AuthorsPanelProps): ReactElement {
  const t = useTranslations("review");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const locale_router = useLocaleRouter();
  const is_owner = viewer_role === "owner";
  const [confirming_user_id, set_confirming_user_id] = useState<string | null>(null);
  const [username, set_username] = useState("");
  const [username_guidance, set_username_guidance] = useState("");
  const [outcome, set_outcome] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [invite_url, set_invite_url] = useState("");
  const [copy_state, set_copy_state] = useState<"idle" | "copied" | "failed">("idle");
  const [is_busy, start_busy] = useTransition();

  function error_text(error_key: ReviewErrorKey, request_id?: string): string {
    return t(`errors.${error_key}`, { requestId: request_id ?? "" });
  }

  function add_coauthor(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    set_outcome(null);
    const guidance_key = get_username_guidance(username);
    if (guidance_key) {
      set_username_guidance(tAuth(`guidance.${guidance_key}`));
      document.getElementById("coauthor-username")?.focus();
      return;
    }
    const name = normalize_username(username);
    start_busy(async () => {
      const result = await add_post_coauthor(post_id, name, slug);
      if (result.status !== "ok") {
        set_outcome({ tone: "error", text: error_text(result.error_key, result.request_id) });
        return;
      }
      set_outcome({
        tone: result.outcome === "added" ? "success" : "error",
        text: t(`authors.outcomes.${result.outcome}`, { username: name }),
      });
      if (result.outcome === "added") {
        set_username("");
        router.refresh();
      }
    });
  }

  function remove_author(user_id: string): void {
    if (confirming_user_id !== user_id) {
      set_confirming_user_id(user_id);
      return;
    }
    set_outcome(null);
    start_busy(async () => {
      const result = await remove_post_author(post_id, user_id, slug);
      set_confirming_user_id(null);
      if (result.status !== "ok") {
        set_outcome({ tone: "error", text: error_text(result.error_key, result.request_id) });
        return;
      }
      // Someone who leaves can no longer see the review: take them to their own list.
      if (user_id === viewer_user_id) locale_router.push("/upload");
      router.refresh();
    });
  }

  function create_invite(): void {
    set_outcome(null);
    set_copy_state("idle");
    start_busy(async () => {
      const result = await create_post_invite(post_id);
      if (result.status !== "ok") {
        set_outcome({ tone: "error", text: error_text(result.error_key, result.request_id) });
        return;
      }
      set_invite_url(`${window.location.origin}${getPathname({ href: `/invite/${result.token}`, locale })}`);
    });
  }

  async function copy_invite(): Promise<void> {
    try {
      await navigator.clipboard.writeText(invite_url);
      set_copy_state("copied");
    } catch {
      set_copy_state("failed");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="authors-title" aria-busy={is_busy}>
      <h2 id="authors-title" className={styles.cardTitle}>
        {t("authors.title")}
      </h2>
      <ul className={styles.authors}>
        {authors.map((author) => {
          const is_viewer = author.user_id === viewer_user_id;
          const can_remove = author.role === "coauthor" && (is_owner || is_viewer);
          const is_confirming = confirming_user_id === author.user_id;
          return (
            <li key={author.user_id} className={styles.author}>
              <span>
                <strong>@{author.username}</strong>{" "}
                <span className={styles.muted}>
                  {t(`authors.role.${author.role}`)}
                  {is_viewer && ` · ${t("authors.you")}`}
                </span>
              </span>
              {can_remove && (
                <button
                  type="button"
                  className={styles.textButton}
                  data-confirming={is_confirming || undefined}
                  disabled={is_busy}
                  onClick={() => remove_author(author.user_id)}
                >
                  {is_viewer
                    ? t(is_confirming ? "authors.confirmLeave" : "authors.leave")
                    : t(is_confirming ? "authors.confirmRemove" : "authors.remove", { username: author.username })}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {is_owner && (
        <>
          <form className={styles.inlineForm} noValidate onSubmit={add_coauthor}>
            <div className="form-field">
              <label htmlFor="coauthor-username" className="form-label">
                {t("authors.addTitle")}
              </label>
              <div className={styles.inputRow}>
                <input
                  id="coauthor-username"
                  type="text"
                  className="form-input"
                  placeholder="@username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  aria-invalid={username_guidance !== ""}
                  aria-describedby="coauthor-username-hint coauthor-username-guidance"
                  onChange={(event) => {
                    set_username(event.target.value);
                    set_username_guidance("");
                  }}
                />
                <button type="submit" className={styles.secondaryButton} disabled={is_busy}>
                  {is_busy ? t("authors.adding") : t("authors.add")}
                </button>
              </div>
              <p id="coauthor-username-hint" className="form-hint">
                {t("authors.addHint")}
              </p>
              <p
                id="coauthor-username-guidance"
                className="form-guidance"
                aria-live="polite"
                hidden={username_guidance === ""}
              >
                {username_guidance}
              </p>
            </div>
          </form>

          <div className={styles.invite}>
            <p className="form-label">{t("authors.inviteTitle")}</p>
            <p className="form-hint">{t("authors.inviteHint")}</p>
            {invite_url ? (
              <div className="form-field">
                <label htmlFor="invite-url" className="visually-hidden">
                  {t("authors.inviteLabel")}
                </label>
                <input
                  id="invite-url"
                  className="form-input"
                  readOnly
                  value={invite_url}
                  onFocus={(event) => event.target.select()}
                />
                <button type="button" className={styles.secondaryButton} onClick={copy_invite}>
                  {copy_state === "copied" ? t("authors.copied") : t("authors.copy")}
                </button>
                {copy_state === "failed" && <p className="form-guidance">{t("authors.copyFailed")}</p>}
              </div>
            ) : (
              <button type="button" className={styles.secondaryButton} disabled={is_busy} onClick={create_invite}>
                {is_busy ? t("authors.creatingInvite") : t("authors.createInvite")}
              </button>
            )}
          </div>
        </>
      )}

      {outcome && <FormAlert tone={outcome.tone}>{outcome.text}</FormAlert>}
    </section>
  );
}
