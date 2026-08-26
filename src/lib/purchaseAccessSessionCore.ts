import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PURCHASE_ACCESS_COOKIE = "wbk_purchase_access";
export const PURCHASE_ACCESS_SESSION_DAYS = 30;

export type PurchaseAccessSessionPayload = {
  v: 1;
  bookId: string;
  purchaseId: string;
  exp: number;
  nonce: string;
};

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createPurchaseAccessToken(bookId: string, purchaseId: string, secret: string, now = Date.now()) {
  const payload: PurchaseAccessSessionPayload = {
    v: 1,
    bookId,
    purchaseId,
    exp: now + PURCHASE_ACCESS_SESSION_DAYS * 24 * 60 * 60 * 1000,
    nonce: randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyPurchaseAccessToken(token: string | undefined, bookId: string, secret: string, now = Date.now()) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, secret);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<PurchaseAccessSessionPayload>;
    if (payload.v !== 1 || payload.bookId !== bookId || !payload.purchaseId || !payload.exp || payload.exp < now) return null;
    return payload as PurchaseAccessSessionPayload;
  } catch {
    return null;
  }
}

export function purchaseAccessCookieOptions(slug: string, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: PURCHASE_ACCESS_SESSION_DAYS * 24 * 60 * 60,
    path: `/books/${encodeURIComponent(slug)}`,
  };
}
