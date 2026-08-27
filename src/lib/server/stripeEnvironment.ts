import "server-only";

/** Returns the Stripe mode this deployment is configured to serve. */
export function expectedStripeLivemode(): boolean {
  const explicit = process.env.STRIPE_EXPECTED_LIVEMODE?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (key?.startsWith("sk_live_")) return true;
  if (key?.startsWith("sk_test_")) return false;
  throw new Error("Stripe environment configuration is unavailable.");
}
