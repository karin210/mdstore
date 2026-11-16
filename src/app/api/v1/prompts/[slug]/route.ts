// One prompt's metadata (catalogue first, then posted), or 404. Read-only and public. Unlike the
// list, it adds `sha256` (free prompts only, so the CLI can verify its download), `worksWith`,
// `lineCount` and `context_tokens`. The file itself is served by the `file` sibling.
import { logServerError } from "@/server/logServerError";
import { api_error, api_messages, get_api_prompt_view, to_prompt_details } from "@/server/prompts/promptApi";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/prompts/[slug]">): Promise<Response> {
  const { slug } = await ctx.params;

  try {
    const prompt = await get_api_prompt_view(slug);
    if (!prompt) return api_error(404, api_messages.not_found);
    return Response.json(to_prompt_details(prompt));
  } catch (error) {
    return api_error(500, api_messages.server_error, logServerError(`api GET /api/v1/prompts/${slug}`, error));
  }
}
