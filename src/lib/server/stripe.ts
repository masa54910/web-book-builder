import "server-only";

import Stripe from "stripe";

/** Stripe is initialized lazily so builds do not require a secret. */
export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

export function requireStripeClient(): Stripe {
  const client = getStripeClient();
  if (!client) throw new Error("Stripe server configuration is unavailable.");
  return client;
}
