import { NextResponse } from "next/server";

import { FulfillmentError, fulfillCheckoutSession, validateCheckoutSessionId } from "@/lib/server/purchaseFulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "お支払いを確認できませんでした。" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const sessionId = body && typeof body === "object" && typeof (body as { session_id?: unknown }).session_id === "string"
    ? (body as { session_id: string }).session_id.trim()
    : "";
  if (!validateCheckoutSessionId(sessionId)) {
    return NextResponse.json({ success: false, message: "お支払いを確認できませんでした。" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await fulfillCheckoutSession(sessionId);
    return NextResponse.json(
      { success: true, access_code: result.accessCode, book_slug: result.bookSlug },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const knownError = error instanceof FulfillmentError;
    const status = knownError ? 400 : 503;
    return NextResponse.json(
      { success: false, message: knownError && error.code === "session_not_paid" ? "まだお支払いを確認できません。" : "お支払いを確認できませんでした。" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
