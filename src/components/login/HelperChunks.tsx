import { useTranslations } from "next-intl";
import { Fragment, type ReactElement } from "react";

export interface HelperChunk {
  id: string;
  text: string;
  isMet: boolean;
}

interface HelperChunksProps {
  id: string;
  label: string;
  chunks: HelperChunk[];
  /** Text between chunks ("" for the email example, ", " for the password rules). */
  separator: string;
  /** Before the first keystroke the whole line stays in the default text colour. */
  wasEdited: boolean;
}

/**
 * The fixed helper line under the email and sign-up password fields. Its wording never changes;
 * each chunk turns green when met and red when missing (once the field was edited), with hidden
 * "(done)" / "(missing)" text so colour is never the only cue. Polite live region.
 */
export function HelperChunks({ id, label, chunks, separator, wasEdited }: HelperChunksProps): ReactElement {
  const t = useTranslations("auth");

  return (
    <p id={id} className="form-hint" aria-live="polite">
      {label}{" "}
      {chunks.map((chunk, index) => {
        const state = wasEdited ? (chunk.isMet ? "met" : "missing") : undefined;
        return (
          <Fragment key={chunk.id}>
            {index > 0 && separator}
            <span data-state={state}>{chunk.text}</span>
            {state && <span className="visually-hidden"> {state === "met" ? t("chunkMet") : t("chunkMissing")}</span>}
          </Fragment>
        );
      })}
    </p>
  );
}
