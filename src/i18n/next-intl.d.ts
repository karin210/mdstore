import type { Messages } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";

// Types every translation key and locale: a typo in `trans("home.hero.title")` fails the build.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
