import { notFound } from "next/navigation";
import type { PromptView } from "@/lib/promptView";
import { getPromptView } from "@/server/prompts/getPromptView";
import { getPostedPromptForViewer } from "@/server/prompts/viewerPostedPrompt";

/**
 * Resolves a /prompts/[slug] params promise to its prompt, or renders the 404 page.
 * Public prompts (catalogue or approved posts) come from the shared cache. Only when none is found
 * does it read the visitor's own session, so an author or admin can open a post still in review.
 */
export async function getPromptOrNotFound(params: Promise<{ slug: string }>): Promise<PromptView> {
  const { slug } = await params;
  const prompt = (await getPromptView(slug)) ?? (await getPostedPromptForViewer(slug));
  if (!prompt) notFound();
  return prompt;
}
