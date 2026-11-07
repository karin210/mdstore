import type { ReactElement } from "react";

interface InlineCodeProps {
  /** Plain text where `backticked` fragments become <code>. */
  text: string;
}

/** Renders the only Markdown the listing copy uses: `inline code`. */
export function InlineCode({ text }: InlineCodeProps): ReactElement {
  // Splitting on backticks puts the code fragments at the odd indexes.
  const parts = text.split("`");

  return <>{parts.map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))}</>;
}
