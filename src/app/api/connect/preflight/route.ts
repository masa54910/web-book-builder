import { NextResponse } from "next/server";

import { runConnectPaymentPreflight } from "@/lib/server/connectPreflight";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const body = await request.json() as { bookId?: unknown };
    const result = await runConnectPaymentPreflight(user.id, typeof body.bookId === "string" ? body.bookId : "");
    return NextResponse.json(result, { status: result.readyForPayment ? 200 : 422 });
  } catch (error) {
    console.error("connect.preflight failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "決済前確認を完了できませんでした。" }, { status: 503 });
  }
}
