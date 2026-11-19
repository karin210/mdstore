import { getFormatter } from "next-intl/server";
import type { ReactElement } from "react";
import { ChangeUsernameForm } from "@/components/profile/ChangeUsernameForm/ChangeUsernameForm";
import { PickUsernameForm } from "@/components/shared/PickUsernameForm/PickUsernameForm";
import { get_next_username_change } from "@/lib/validation/accountChanges";
import { require_account_profile } from "@/server/profiles/requireAccountProfile";

/**
 * The username section's form: "pick your username" for older accounts without one, otherwise the
 * rename form with the date the 30-day cool-down ends, if it is running. Reads the session.
 */
export async function UsernameSlot(): Promise<ReactElement> {
  const profile = await require_account_profile("/profile");
  if (!profile.username) return <PickUsernameForm />;

  const format = await getFormatter();
  const next_change = get_next_username_change(profile.username_changed_at);

  return (
    <ChangeUsernameForm
      current_username={profile.username}
      next_change_label={next_change ? format.dateTime(next_change, { dateStyle: "long", timeZone: "UTC" }) : null}
    />
  );
}
