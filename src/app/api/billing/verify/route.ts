import { NextResponse } from "next/server";

import { PlanBillingError, fulfillPlanCheckoutSession } from "@/lib/server/planBillingFulfillment";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, message: "認証が必要です。" }, { status: 401 });
  let body: { session_id?: unknown };
  try { body = await request.json() as { session_id?: unknown }; } catch { return NextResponse.json({ success: false, message: "決済を確認できませんでした。" }, { status: 400 }); }
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return NextResponse.json({ success: false, message: "決済を確認できませんでした。" }, { status: 400 });
  try {
    const result = await fulfillPlanCheckoutSession(sessionId, user.id);
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof PlanBillingError ? 400 : 503;
    return NextResponse.json({ success: false, message: "決済を確認できませんでした。" }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
