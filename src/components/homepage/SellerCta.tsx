import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import { siteConfig } from "@/lib/site";
import styles from "./SellerCta.module.css";

const sellerPerks = [
  "You set the price",
  "Paid on every sale",
  "Free previews that sell for you",
  "Push updates to every buyer",
];

export function SellerCta(): ReactElement {
  const mailto = `mailto:${siteConfig.sellerContactEmail}?subject=${encodeURIComponent("Seller access request")}`;

  return (
    <section id="sell" className={styles.wrapper} aria-labelledby="sell-title">
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className="eyebrow">{"// for sellers"}</p>
          <h2 id="sell-title" className={styles.title}>
            Your best prompt is already written. Start selling it.
          </h2>
          <p className={styles.lead}>
            The instructions you refined over hundreds of agent runs are worth something to developers who
            haven&rsquo;t. Seller onboarding is in early access.
          </p>
          <SecondaryButton href={mailto} size="large">
            Request seller access
          </SecondaryButton>
        </div>
        <ul className={styles.perks}>
          {sellerPerks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
