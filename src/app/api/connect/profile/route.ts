import { NextResponse } from "next/server";

import { evaluateSellerProfileCompleteness, type AuthorSellerProfileInput, type SellerType } from "@/lib/sellerConnect";
import { getAuthorSellerProfile, saveAuthorSellerProfile } from "@/lib/server/sellerConnectRepository";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";

function inputFromUnknown(value: unknown, userId: string): AuthorSellerProfileInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === "string" ? record[key] as string : "");
  const sellerType = text("sellerType") as SellerType;
  if (sellerType !== "individual" && sellerType !== "company") return null;
  return {
    userId,
    sellerType,
    legalName: text("legalName"),
    tradeName: text("tradeName"),
    representativeName: text("representativeName"),
    countryCode: text("countryCode"),
    postalCode: text("postalCode"),
    region: text("region"),
    city: text("city"),
    addressLine1: text("addressLine1"),
    addressLine2: text("addressLine2"),
    phone: text("phone"),
    supportEmail: text("supportEmail"),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    return NextResponse.json({ profile: await getAuthorSellerProfile(user.id) });
  } catch (error) {
    console.error("connect.profile.read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "販売者情報を読み込めませんでした。" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const profile = inputFromUnknown(await request.json(), user.id);
    if (!profile) return NextResponse.json({ error: "販売者情報の形式が正しくありません。" }, { status: 400 });
    const saved = await saveAuthorSellerProfile(user.id, profile);
    return NextResponse.json({ profile: saved, completeness: evaluateSellerProfileCompleteness(saved) });
  } catch (error) {
    console.error("connect.profile.save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "販売者情報を保存できませんでした。" }, { status: 503 });
  }
}
