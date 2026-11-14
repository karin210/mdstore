// Lists prompts (catalogue and posted) as summaries, optionally filtered by a search text and a
// category. Read-only and public, like its siblings: `[slug]` returns one prompt's metadata and
// `[slug]/file` its .md. Never includes file content.
import type { NextRequest } from "next/server";
import { z } from "zod";
import { promptCategories } from "@/data/prompts";
import { logServerError } from "@/server/logServerError";
import { api_error, api_messages, list_prompt_summaries } from "@/server/prompts/promptApi";

const list_query_schema = z.strictObject({
  q: z.string().trim().max(100).optional(),
  category: z.enum(promptCategories).optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  const parsed = list_query_schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return api_error(400, api_messages.invalid_query);

  try {
    const prompts = await list_prompt_summaries(parsed.data);
    return Response.json({ prompts });
  } catch (error) {
    return api_error(500, api_messages.server_error, logServerError("api GET /api/v1/prompts", error));
  }
}
