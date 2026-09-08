import { NextResponse } from "next/server";

import { getBookCreationLimitForUser } from "@/lib/server/planBillingRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const maxBooksPerUser = await getBookCreationLimitForUser(user.id, expectedStripeLivemode());
    return NextResponse.json({ maxBooksPerUser }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("billing.limits failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "作品数上限を確認できませんでした。" }, { status: 503 });
  }
}
