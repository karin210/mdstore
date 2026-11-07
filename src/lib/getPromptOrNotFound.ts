import { notFound } from "next/navigation";
import { findPromptBySlug, type PromptListing } from "@/data/prompts";

/** Resolves a /prompts/[slug] params promise to its listing, or renders the 404 page. */
export async function getPromptOrNotFound(params: Promise<{ slug: string }>): Promise<PromptListing> {
  const { slug } = await params;
  const prompt = findPromptBySlug(slug);
  if (!prompt) notFound();
  return prompt;
}
