import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { isPlainRecord, readFullDesignRequest } from "@/lib/fullDesignContract";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.user) return json({ error: "管理者権限が必要です。" }, auth.status);
    const admin = requireSupabaseAdminClient();
    const [settings, limits, runs] = await Promise.all([
      admin.from("full_design_settings").select("value,updated_at").eq("key", "ai_full_design_api_enabled").single(),
      admin.from("full_design_plan_limits").select("plan_code,daily_limit"),
      admin.from("full_design_runs").select("id,mode,plan_code,status,model,input_tokens,output_tokens,cached_tokens,latency_ms,failure_stage,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (settings.error || limits.error || runs.error) throw new Error("storage");
    return json({ apiEnabled: settings.data.value, limits: limits.data, runs: runs.data });
  } catch { return json({ error: "設定を取得できませんでした。" }, 503); }
}
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.user) return json({ error: "管理者権限が必要です。" }, auth.status);
    const body = await readFullDesignRequest(request);
    if (!isPlainRecord(body) || typeof body.apiEnabled !== "boolean" || Object.keys(body).some((key) => key !== "apiEnabled")) return json({ error: "入力内容が正しくありません。" }, 400);
    const { error } = await requireSupabaseAdminClient().from("full_design_settings").update({ value: body.apiEnabled, updated_by: auth.user.id, updated_at: new Date().toISOString() }).eq("key", "ai_full_design_api_enabled");
    if (error) throw new Error("storage");
    return json({ apiEnabled: body.apiEnabled });
  } catch { return json({ error: "設定を変更できませんでした。" }, 503); }
}
