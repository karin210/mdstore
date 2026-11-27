import type { ReactElement } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownFile.module.css";

interface MarkdownFileProps {
  /** The file's Markdown, as posted. */
  markdown: string;
  /** Accessible name of the scrollable block ("Full CLAUDE.md"). */
  label: string;
}

/*
 * The file's headings sit under the section's h2, so they move down to h3–h6 and the page outline stays sound.
 * Images are left out (their alt text stays): a posted file could load anything from anywhere in a reader's
 * browser. Links lead outside mdstore, so they carry rel="nofollow ugc noopener".
 */
const COMPONENTS: Components = {
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
  h4: ({ children }) => <h6>{children}</h6>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
  a: ({ href, title, children }) => (
    <a href={href} title={title} rel="nofollow ugc noopener">
      {children}
    </a>
  ),
};

/**
 * A posted .md file, rendered: headings, lists, tables, code blocks. Raw HTML in the file is shown as text, never
 * run (react-markdown's default), and unsafe link targets are dropped. Synchronous, so it renders on the server
 * and in the upload preview's browser tab alike.
 */
export function MarkdownFile({ markdown, label }: MarkdownFileProps): ReactElement {
  return (
    // Focusable so keyboard users can scroll a long file.
    <div className={styles.file} tabIndex={0} role="region" aria-label={label}>
      <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {markdown}
      </Markdown>
    </div>
  );
}
