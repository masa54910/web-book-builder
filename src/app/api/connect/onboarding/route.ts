import { NextResponse } from "next/server";

import { createHostedOnboardingLink } from "@/lib/server/connectOnboarding";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

    const result = await createHostedOnboardingLink(user.id, new URL(request.url).origin);
    if (result.kind === "incomplete") {
      return NextResponse.json(
        { error: "作者プロフィールを完成させてから本人確認を開始してください。", missingFields: result.missingFields },
        { status: 422 },
      );
    }
    return NextResponse.json({ url: result.url, account: result.account });
  } catch (error) {
    console.error("connect.onboarding.start failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Stripe本人確認を開始できませんでした。時間をおいて再度お試しください。" }, { status: 503 });
  }
}
