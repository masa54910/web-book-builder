import { NextResponse } from "next/server";

import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authResponse(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "ログインが必要です。" : "管理者権限が必要です。" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const auth = await authenticateAdminRequest(request);
  if (auth.status) return authResponse(auth.status);

  const { data, error } = await requireSupabaseAdminClient()
    .from("contact_inquiries")
    .select("id,created_at,updated_at,name,reply_email,category,status")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("admin.inquiries.list failed", error.message);
    return NextResponse.json({ error: "お問い合わせ一覧を読み込めませんでした。" }, { status: 503 });
  }

  return NextResponse.json({ inquiries: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

