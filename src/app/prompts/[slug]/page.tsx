import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { OutputExamples } from "@/components/prompt-detail/OutputExamples";
import { downloadHref, featuredPrompts, findPromptBySlug, isFree, type PromptListing } from "@/data/prompts";
import { formatPrice } from "@/lib/formatPrice";
import { readPromptMarkdown } from "@/lib/promptFiles";
import styles from "./page.module.css";

/** Every listing is known at build time, so each detail page is prerendered. */
export function generateStaticParams(): { slug: string }[] {
  return featuredPrompts.map((prompt) => ({ slug: prompt.slug }));
}

async function getPromptOrNotFound(params: Promise<{ slug: string }>): Promise<PromptListing> {
  const { slug } = await params;
  const prompt = findPromptBySlug(slug);
  if (!prompt) notFound();
  return prompt;
}

export async function generateMetadata({ params }: PageProps<"/prompts/[slug]">): Promise<Metadata> {
  const prompt = await getPromptOrNotFound(params);

  return {
    title: `${prompt.title} (${prompt.fileName})`,
    description: prompt.summary,
  };
}

export default async function PromptDetailPage({ params }: PageProps<"/prompts/[slug]">): Promise<ReactElement> {
  const prompt = await getPromptOrNotFound(params);
  const free = isFree(prompt);
  const remainingLines = prompt.lineCount - prompt.excerpt.split("\n").length;
  // Only free files are read: a paid file's content must never reach the page's HTML.
  const fullMarkdown = free ? await readPromptMarkdown(prompt.fileName) : null;

  return (
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/#featured">Prompts</Link>
          </li>
          <li>
            <span aria-current="page">{prompt.fileName}</span>
          </li>
        </ol>
      </nav>

      <article className={styles.layout} aria-labelledby="prompt-title">
        <header className={styles.header}>
          <p className={styles.top}>
            <code className={styles.fileName}>{prompt.fileName}</code>
            <span className={styles.category}>{prompt.category}</span>
          </p>
          <h1 id="prompt-title" className={styles.title}>
            {prompt.title}
          </h1>
          <p className={styles.summary}>{prompt.summary}</p>
        </header>

        <aside className={styles.purchase} aria-labelledby="purchase-title">
          <h2 id="purchase-title" className="visually-hidden">
            Get this file
          </h2>
          <p className={styles.price}>{formatPrice(prompt.priceUsd)}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Author</dt>
              <dd>{prompt.author}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{prompt.lineCount} lines</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{prompt.category}</dd>
            </div>
            <div>
              <dt>Tested with</dt>
              <dd>
                <ul className={styles.tools}>
                  {prompt.worksWith.map((tool) => (
                    <li key={tool}>{tool}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
          {free ? (
            <>
              <PrimaryButton href={downloadHref(prompt)} download aria-label={`Download ${prompt.fileName}`}>
                Download {prompt.fileName}
              </PrimaryButton>
              <p className={styles.note}>Free: download the full .md and drop it into your repo.</p>
            </>
          ) : (
            <p className={styles.note}>
              Checkout opens soon. Once bought, the full file is delivered as a .md download, future versions
              included.
            </p>
          )}
        </aside>

        <div className={styles.examples}>
          <OutputExamples examples={prompt.outputExamples} fileName={prompt.fileName} />
        </div>

        <section className={styles.preview} aria-labelledby="preview-title">
          <header className={styles.previewHeader}>
            <h2 id="preview-title" className={styles.sectionTitle}>
              Free preview
            </h2>
            <p className={styles.note}>
              The first lines of {prompt.fileName}, exactly as your agent will read them.
              {fullMarkdown && " It's free, so you can read the whole file here too."}
            </p>
          </header>
          <div className={styles.fileView}>
            <pre className={styles.excerpt}>
              <code>
                {prompt.excerpt}
                {remainingLines > 0 && (
                  <>
                    {"\n\n"}
                    <span data-token="comment">{`<!-- ${remainingLines} more lines -->`}</span>
                  </>
                )}
              </code>
            </pre>
            {fullMarkdown && (
              // Native disclosure; while open it replaces the excerpt (see .fileView in the CSS).
              <details className={styles.fullFile}>
                {/* Tertiary kind: informational trigger with no purchase intent */}
                <summary className={styles.toggle}>
                  <span data-label="show">Show the full file ({prompt.lineCount} lines)</span>
                  <span data-label="hide">Hide the full file</span>
                </summary>
                {/* Focusable so keyboard users can scroll the long file */}
                <pre className={styles.excerpt} data-full="true" tabIndex={0} aria-label={`Full ${prompt.fileName}`}>
                  <code>{fullMarkdown}</code>
                </pre>
              </details>
            )}
          </div>
        </section>
      </article>
    </main>
  );
}
