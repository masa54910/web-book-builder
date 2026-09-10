import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateAdminRequest(request); if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { slug } = await params; if (slug !== "teacher") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})); const version = Number(body.version); if (!Number.isInteger(version) || version < 1) return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  const admin = requireSupabaseAdminClient(); const target = await admin.from("sample_book_snapshots").select("id,source_master_book_id").eq("sample_slug", slug).eq("version", version).maybeSingle(); if (!target.data) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  const owner = await admin.from("books").select("owner_id").eq("id", target.data.source_master_book_id).maybeSingle(); if (owner.data?.owner_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await admin.from("sample_book_snapshots").update({ is_active: false }).eq("sample_slug", slug).eq("is_active", true); await admin.from("sample_book_snapshots").update({ is_active: true, superseded_at: null }).eq("id", target.data.id);
  return NextResponse.json({ ok: true, version });
}
