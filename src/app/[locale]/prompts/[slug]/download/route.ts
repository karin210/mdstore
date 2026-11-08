import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { findPromptBySlug, isFree } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import { readPromptMarkdown } from "@/lib/promptFiles";

/** Serves a free listing's full .md file as a download. Paid files are never served here. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/[locale]/prompts/[slug]/download">,
): Promise<Response> {
  const { locale: requestedLocale, slug } = await ctx.params;
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "promptDetail.download" });
  const prompt = findPromptBySlug(slug);

  if (!prompt) {
    return Response.json({ message: t("notFound") }, { status: 404 });
  }
  if (!isFree(prompt)) {
    return Response.json({ message: t("purchaseRequired") }, { status: 403 });
  }

  try {
    const markdown = await readPromptMarkdown(prompt.fileName);

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${prompt.fileName}"`,
      },
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[download] GET /prompts/${slug}/download failed (requestId ${requestId})`, error);

    return Response.json({ message: t("serverError"), requestId }, { status: 500 });
  }
}
