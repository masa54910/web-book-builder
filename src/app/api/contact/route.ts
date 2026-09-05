import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const categories = new Set(["usage", "pricing", "payment", "book_purchase", "account", "technical", "other"]);
const recentByIp = new Map<string, number[]>();
const windowMs = 10 * 60 * 1000;
const maxRequests = 5;

function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim().slice(0, 128) || "unknown";
}

function rateLimited(ip: string) {
  const now = Date.now();
  const timestamps = (recentByIp.get(ip) || []).filter((value) => now - value < windowMs);
  if (timestamps.length >= maxRequests) {
    recentByIp.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  recentByIp.set(ip, timestamps);
  return false;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    if (rateLimited(clientIp(request))) return NextResponse.json({ error: "送信回数が上限に達しました。時間をおいて再度お試しください。" }, { status: 429 });
    const body = await request.json() as Record<string, unknown>;
    // Honeypot submissions receive the same success response without a database write.
    if (text(body.website, 200)) return NextResponse.json({ ok: true });
    const name = text(body.name, 120);
    const replyEmail = text(body.replyEmail, 254);
    const category = text(body.category, 40);
    const message = text(body.message, 5000);
    if (!name || !validEmail(replyEmail) || !categories.has(category) || !message) {
      return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
    }
    const user = await requireAuthenticatedUser(request);
    const { error } = await requireSupabaseAdminClient().from("contact_inquiries").insert({
      user_id: user?.id || null,
      name,
      reply_email: replyEmail,
      category,
      message,
      status: "new",
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("contact.submit failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "お問い合わせを送信できませんでした。時間をおいて再度お試しください。" }, { status: 503 });
  }
}
