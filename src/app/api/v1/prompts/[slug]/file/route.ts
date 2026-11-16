// A free prompt's raw .md (text/markdown), for the CLI. Read-only and public. Unlike the site's
// /prompts/[slug]/download it is not an attachment and answers in JSON on errors: 403 for paid
// prompts (their content is never read) and 404 for unknown slugs.
import { isFree } from "@/data/prompts";
import { logServerError } from "@/server/logServerError";
import { api_error, api_messages, get_api_prompt_view } from "@/server/prompts/promptApi";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/prompts/[slug]/file">): Promise<Response> {
  const { slug } = await ctx.params;

  try {
    const prompt = await get_api_prompt_view(slug);
    if (!prompt) return api_error(404, api_messages.not_found);
    if (!isFree(prompt) || prompt.fullMarkdown === null) return api_error(403, api_messages.paid);

    return new Response(prompt.fullMarkdown, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (error) {
    return api_error(500, api_messages.server_error, logServerError(`api GET /api/v1/prompts/${slug}/file`, error));
  }
}
