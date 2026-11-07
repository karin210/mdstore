import { readFile } from "node:fs/promises";
import path from "node:path";
import { findPromptBySlug, isFree } from "@/data/prompts";

/** Serves a free listing's full .md file as a download. Paid files are never served here. */
export async function GET(_request: Request, ctx: RouteContext<"/prompts/[slug]/download">): Promise<Response> {
  const { slug } = await ctx.params;
  const prompt = findPromptBySlug(slug);

  if (!prompt) {
    return Response.json({ message: "This prompt doesn't exist." }, { status: 404 });
  }
  if (!isFree(prompt)) {
    return Response.json({ message: "This prompt has to be purchased before it can be downloaded." }, { status: 403 });
  }

  try {
    // The file name comes from the catalogue, never from the request, so it can't escape the folder.
    const markdown = await readFile(path.join(process.cwd(), "content", "prompts", prompt.fileName), "utf8");

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${prompt.fileName}"`,
      },
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error(`[download] GET /prompts/${slug}/download failed (requestId ${requestId})`, error);

    return Response.json(
      { message: "Something went wrong on our side. Please try again in a moment.", requestId },
      { status: 500 },
    );
  }
}
