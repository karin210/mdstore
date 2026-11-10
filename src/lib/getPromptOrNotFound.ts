import { notFound } from "next/navigation";
import type { PromptView } from "@/lib/promptView";
import { getPromptView } from "@/server/prompts/getPromptView";

/** Resolves a /prompts/[slug] params promise to its prompt (catalogue or posted), or renders the 404 page. */
export async function getPromptOrNotFound(params: Promise<{ slug: string }>): Promise<PromptView> {
  const { slug } = await params;
  const prompt = await getPromptView(slug);
  if (!prompt) notFound();
  return prompt;
}
