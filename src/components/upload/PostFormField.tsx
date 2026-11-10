import type { ReactElement, ReactNode } from "react";

interface PostFormFieldProps {
  id: string;
  label: string;
  hint?: string;
  /** What is wrong with the value, once the field was edited; empty when there is nothing to say. */
  guidance_text: string;
  /** The control; it must reference `${id}-hint` and `${id}-guidance` in aria-describedby. */
  children: ReactNode;
}

/** Label, control, a short description and the inline guidance below, for one upload-form field. */
export function PostFormField({ id, label, hint, guidance_text, children }: PostFormFieldProps): ReactElement {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="form-hint">
          {hint}
        </p>
      )}
      <p id={`${id}-guidance`} className="form-guidance" aria-live="polite" hidden={guidance_text === ""}>
        {guidance_text}
      </p>
    </div>
  );
}

/** The aria-describedby value for a field rendered with PostFormField. */
export function get_described_by(id: string, has_hint: boolean): string {
  return has_hint ? `${id}-hint ${id}-guidance` : `${id}-guidance`;
}
