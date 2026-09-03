import { NextResponse } from "next/server";

import { CONNECT_TERMS_VERSION, getSalesConsent, saveSalesConsent } from "@/lib/server/salesConsentRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const consent = await getSalesConsent(user.id);
    return NextResponse.json({ consent, currentTermsVersion: CONNECT_TERMS_VERSION });
  } catch (error) {
    console.error("connect.consent.read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "販売同意を確認できませんでした。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const body = await request.json() as { accepted?: unknown; termsVersion?: unknown };
    if (body.accepted !== true || (body.termsVersion !== undefined && body.termsVersion !== CONNECT_TERMS_VERSION)) return NextResponse.json({ error: "販売条件への同意が必要です。" }, { status: 400 });
    return NextResponse.json({ consent: await saveSalesConsent(user.id) });
  } catch (error) {
    console.error("connect.consent.save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "販売同意を保存できませんでした。" }, { status: 503 });
  }
}
