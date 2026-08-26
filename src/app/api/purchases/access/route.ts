import { NextResponse } from "next/server";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { verifyAccessCodeHash } from "@/lib/server/accessCodeCore";
import { createPurchaseAccessToken, purchaseAccessCookieOptions, PURCHASE_ACCESS_COOKIE } from "@/lib/server/purchaseAccessSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const failures = new Map<string, { count: number; resetAt: number }>();

function genericFailure(status = 401) {
  return NextResponse.json({ success: false, message: "閲覧コードを確認できませんでした。" }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return genericFailure(400); }
  const input = body && typeof body === "object" ? body as { slug?: unknown; accessCode?: unknown } : {};
  const slug = typeof input.slug === "string" ? input.slug.trim() : "";
  const accessCode = typeof input.accessCode === "string" ? input.accessCode.trim() : "";
  if (!slug || !accessCode || accessCode.length > 128) return genericFailure(400);
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  const key = `${ip}:${slug}`;
  const now = Date.now();
  const current = failures.get(key);
  if (current && current.resetAt > now && current.count >= 5) return genericFailure(429);

  try {
    const admin = requireSupabaseAdminClient();
    const { data: book, error: bookError } = await admin.from("books").select("id,slug,status,visibility,deleted_at").eq("slug", slug).eq("status", "published").in("visibility", ["public", "unlisted"]).is("deleted_at", null).maybeSingle();
    if (bookError || !book) return genericFailure(404);
    const { data: purchases, error } = await admin.from("book_purchases").select("id,book_id,access_code_hash,payment_status,revoked_at").eq("book_id", book.id).eq("payment_status", "paid").is("revoked_at", null).limit(20);
    const match = !error && (purchases || []).find((purchase) => typeof purchase.access_code_hash === "string" && verifyAccessCodeHash(accessCode, purchase.access_code_hash));
    if (!match) {
      const next = current && current.resetAt > now ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: now + 10 * 60 * 1000 };
      failures.set(key, next);
      return genericFailure();
    }
    failures.delete(key);
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(PURCHASE_ACCESS_COOKIE, createPurchaseAccessToken(String(book.id), String(match.id)), purchaseAccessCookieOptions(slug));
    return response;
  } catch {
    return genericFailure(503);
  }
}
