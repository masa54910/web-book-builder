import "server-only";

import { cookies } from "next/headers";
import {
  createPurchaseAccessToken as createToken,
  PURCHASE_ACCESS_COOKIE,
  purchaseAccessCookieOptions as cookieOptions,
  verifyPurchaseAccessToken as verifyToken,
} from "@/lib/purchaseAccessSessionCore";

export { PURCHASE_ACCESS_COOKIE };

function secret() {
  const value = process.env.PURCHASE_ACCESS_SESSION_SECRET?.trim();
  if (!value) throw new Error("PURCHASE_ACCESS_SESSION_SECRET is not configured.");
  return value;
}

export function createPurchaseAccessToken(bookId: string, purchaseId: string) {
  return createToken(bookId, purchaseId, secret());
}

export function verifyPurchaseAccessToken(token: string | undefined, bookId: string) {
  return verifyToken(token, bookId, secret());
}

export async function readPurchaseAccessSession(bookId: string) {
  const store = await cookies();
  return verifyPurchaseAccessToken(store.get(PURCHASE_ACCESS_COOKIE)?.value, bookId);
}

export function purchaseAccessCookieOptions(slug: string) {
  return cookieOptions(slug, process.env.NODE_ENV === "production");
}
