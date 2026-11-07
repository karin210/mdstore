const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(amountUsd: number): string {
  return amountUsd === 0 ? "Free" : usd.format(amountUsd);
}
