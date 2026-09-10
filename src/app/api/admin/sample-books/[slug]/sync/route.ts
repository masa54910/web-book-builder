import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { sanitizeSampleProject } from "@/lib/server/sampleBookSnapshots";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateAdminRequest(request); if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  const { slug } = await params; if (slug !== "teacher") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})); const masterId = typeof body.masterId === "string" ? body.masterId : "";
  const admin = requireSupabaseAdminClient(); const master = await admin.from("books").select("id,owner_id,book_project_json").eq("id", masterId).maybeSingle();
  if (!master.data || master.data.owner_id !== auth.user.id) return NextResponse.json({ error: "Master not found" }, { status: 404 });
  const latest = await admin.from("sample_book_snapshots").select("version").eq("sample_slug", slug).order("version", { ascending: false }).limit(1).maybeSingle(); const version = (latest.data?.version ?? 0) + 1;
  const inserted = await admin.from("sample_book_snapshots").insert({ sample_slug: slug, source_master_book_id: masterId, version, snapshot_json: sanitizeSampleProject(master.data.book_project_json as Record<string, unknown>), is_active: false, created_by: auth.user.id }).select("id,version").single();
  if (inserted.error) return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  await admin.from("sample_book_snapshots").update({ is_active: false, superseded_at: new Date().toISOString() }).eq("sample_slug", slug).eq("is_active", true);
  await admin.from("sample_book_snapshots").update({ is_active: true }).eq("id", inserted.data.id);
  return NextResponse.json(inserted.data);
}
