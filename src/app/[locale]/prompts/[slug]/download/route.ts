import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { isFree } from "@/data/prompts";
import { routing } from "@/i18n/routing";
import { log_server_error } from "@/server/logServerError";
import { get_prompt_view } from "@/server/prompts/getPromptView";

/** Serves a free prompt's full .md file (catalogue or posted) as a download. Paid files are never served here. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/[locale]/prompts/[slug]/download">,
): Promise<Response> {
  const { locale: requestedLocale, slug } = await ctx.params;
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "promptDetail.download" });

  try {
    const prompt = await get_prompt_view(slug, locale);

    if (!prompt) {
      return Response.json({ message: t("notFound") }, { status: 404 });
    }
    if (!isFree(prompt) || prompt.fullMarkdown === null) {
      return Response.json({ message: t("purchaseRequired") }, { status: 403 });
    }

    return new Response(prompt.fullMarkdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${prompt.fileName}"`,
      },
    });
  } catch (error) {
    const requestId = log_server_error(`download GET /prompts/${slug}/download`, error);

    return Response.json({ message: t("serverError"), requestId }, { status: 500 });
  }
}
