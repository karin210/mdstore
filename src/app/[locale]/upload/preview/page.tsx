import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { get_listing_sections } from "@/components/prompt-detail/listingSections/listingSections";
import { RouteIndexLayout } from "@/components/shared/RouteIndexLayout/RouteIndexLayout";
import { PostPreview } from "@/components/upload/PostPreview/PostPreview";
import styles from "./page.module.css";

/** A private working page: out of search results. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("upload.preview.meta");

  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Live preview of the upload form, opened in a new tab from the form (signed-in users only; see src/proxy.ts).
 * It has the listing page's layout and route index; the listing itself comes from the form's tab, in the browser.
 */
export default function UploadPreviewPage(): ReactElement {
  const t = useTranslations("promptDetail.outline");

  return (
    <RouteIndexLayout sections={get_listing_sections(t)} file_name={t("file")} content_class_name={styles.content}>
      <div className={styles.body}>
        <PostPreview />
      </div>
    </RouteIndexLayout>
  );
}
