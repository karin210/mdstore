import type { ReactElement } from "react";
import { SubmissionList } from "@/components/shared/SubmissionList/SubmissionList";
import { getMySubmissions } from "@/server/prompts/mySubmissions";
import { require_account_profile } from "@/server/profiles/requireAccountProfile";

/** Every post the signed-in user owns or co-authors, newest first. Reads the session. */
export async function MyPromptsList(): Promise<ReactElement> {
  const profile = await require_account_profile("/my-prompts");
  return <SubmissionList submissions={await getMySubmissions(profile.user_id)} />;
}
