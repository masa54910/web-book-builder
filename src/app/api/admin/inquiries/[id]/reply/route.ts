import { NextResponse } from "next/server";

import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { sendContactReply } from "@/lib/server/contactReply";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const statuses = new Set(["new", "in_progress", "resolved", "spam"]);

function authResponse(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "ログインが必要です。" : "管理者権限が必要です。" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdminRequest(request);
  if (auth.status) return authResponse(auth.status);
  const { id } = await context.params;
  if (typeof id !== "string" || !uuidPattern.test(id)) return NextResponse.json({ error: "お問い合わせIDが不正です。" }, { status: 400 });

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return NextResponse.json({ error: "返信処理の識別子がありません。画面を更新して再度お試しください。" }, { status: 400 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return NextResponse.json({ error: "返信内容が大きすぎます。" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "返信内容を確認してください。" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const subject = typeof record.subject === "string" ? record.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 200) : "";
  const replyBody = typeof record.body === "string" ? record.body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().slice(0, 5000) : "";
  if (!subject || !replyBody) return NextResponse.json({ error: "件名と返信本文を入力してください。" }, { status: 400 });

  const admin = requireSupabaseAdminClient();
  const { data: inquiry, error: inquiryError } = await admin
    .from("contact_inquiries")
    .select("id,name,reply_email,category,status")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; reply_email: string; category: string; status: string }>();
  if (inquiryError || !inquiry) return NextResponse.json({ error: "お問い合わせが見つかりません。" }, { status: 404 });
  if (!statuses.has(inquiry.status) || inquiry.status === "spam") return NextResponse.json({ error: "このお問い合わせには返信できません。" }, { status: 409 });

  const { data: reservation, error: reservationError } = await admin
    .from("contact_inquiry_replies")
    .insert({ inquiry_id: id, sender_type: "admin", subject, body: replyBody, idempotency_key: idempotencyKey, send_status: "pending" })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (reservationError || !reservation) {
    const { data: existing } = await admin.from("contact_inquiry_replies").select("id,send_status,provider_message_id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing?.send_status === "sent") return NextResponse.json({ ok: true, replayed: true, providerMessageId: existing.provider_message_id ?? null });
    return NextResponse.json({ error: "同じ返信処理がすでに進行中です。履歴を確認してください。" }, { status: 409 });
  }

  try {
    const sent = await sendContactReply({ recipient: inquiry.reply_email, subject, body: replyBody, inquiryName: inquiry.name, category: inquiry.category });
    const { error: replyUpdateError } = await admin.from("contact_inquiry_replies").update({ send_status: "sent", provider_message_id: sent.providerMessageId, sent_at: new Date().toISOString() }).eq("id", reservation.id);
    if (replyUpdateError) throw replyUpdateError;
    const { error: statusError } = await admin.from("contact_inquiries").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", id);
    if (statusError) throw statusError;
    return NextResponse.json({ ok: true, providerMessageId: sent.providerMessageId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin.inquiries.reply failed", error instanceof Error ? error.message : "unknown");
    await admin.from("contact_inquiry_replies").update({ send_status: "failed" }).eq("id", reservation.id);
    return NextResponse.json({ error: "返信を送信できませんでした。履歴を確認して、再度お試しください。" }, { status: 502 });
  }
}

