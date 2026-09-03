import { NextResponse } from "next/server";

import { readConnectedAccountStatus } from "@/lib/server/connectOnboarding";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const result = await readConnectedAccountStatus(user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("connect.status.read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Stripe接続状況を確認できませんでした。" }, { status: 503 });
  }
}
