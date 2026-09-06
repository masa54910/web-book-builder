import { NextResponse } from "next/server";

import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = new Set(["new", "in_progress", "resolved", "spam"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function authResponse(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "ログインが必要です。" : "管理者権限が必要です。" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function inquiryId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return typeof id === "string" && uuidPattern.test(id) ? id : "";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdminRequest(request);
  if (auth.status) return authResponse(auth.status);
  const id = await inquiryId(context);
  if (!id) return NextResponse.json({ error: "お問い合わせIDが不正です。" }, { status: 400 });

  const admin = requireSupabaseAdminClient();
  const [{ data: inquiry, error: inquiryError }, { data: replies, error: repliesError }] = await Promise.all([
    admin.from("contact_inquiries").select("id,user_id,created_at,updated_at,name,reply_email,category,message,status").eq("id", id).maybeSingle(),
    admin.from("contact_inquiry_replies").select("id,inquiry_id,sender_type,subject,body,send_status,provider_message_id,sent_at,created_at").eq("inquiry_id", id).order("created_at", { ascending: true }),
  ]);
  if (inquiryError || !inquiry) return NextResponse.json({ error: "お問い合わせが見つかりません。" }, { status: 404 });
  if (repliesError) {
    console.error("admin.inquiries.detail replies failed", repliesError.message);
    return NextResponse.json({ error: "返信履歴を読み込めませんでした。" }, { status: 503 });
  }

  return NextResponse.json({ inquiry, replies: replies ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdminRequest(request);
  if (auth.status) return authResponse(auth.status);
  const id = await inquiryId(context);
  if (!id) return NextResponse.json({ error: "お問い合わせIDが不正です。" }, { status: 400 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2_000) return NextResponse.json({ error: "入力が大きすぎます。" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const rawStatus = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
  const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (!statuses.has(status)) return NextResponse.json({ error: "対応状況が不正です。" }, { status: 400 });

  const { data, error } = await requireSupabaseAdminClient()
    .from("contact_inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,status,updated_at")
    .maybeSingle();
  if (error || !data) {
    console.error("admin.inquiries.status failed", error?.message ?? "not found");
    return NextResponse.json({ error: "対応状況を更新できませんでした。" }, { status: 503 });
  }
  return NextResponse.json({ inquiry: data }, { headers: { "Cache-Control": "no-store" } });
}
