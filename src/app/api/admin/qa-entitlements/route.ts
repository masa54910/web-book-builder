import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/server/adminAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicState(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: String(row.id), userId: String(row.user_id), isEnabled: Boolean(row.is_enabled), allowPublish: Boolean(row.allow_publish),
    publicationLimit: row.publication_limit == null ? null : Number(row.publication_limit), allowQuickDesign: Boolean(row.allow_quick_design),
    allowFullDesign: Boolean(row.allow_full_design), allowAICritic: Boolean(row.allow_ai_critic), quickDailyLimit: row.quick_daily_limit == null ? null : Number(row.quick_daily_limit),
    quickMonthlyLimit: row.quick_monthly_limit == null ? null : Number(row.quick_monthly_limit), fullDailyLimit: row.full_daily_limit == null ? null : Number(row.full_daily_limit),
    fullMonthlyLimit: row.full_monthly_limit == null ? null : Number(row.full_monthly_limit), expiresAt: row.expires_at ? String(row.expires_at) : null,
    label: row.label ? String(row.label) : null, notes: row.notes ? String(row.notes) : null,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.user) return json({ error: "管理者権限が必要です。" }, auth.status);
    const admin = requireSupabaseAdminClient();
    const [{ data: entitlements, error }, usersResult] = await Promise.all([
      admin.from("qa_test_entitlements").select("*").order("updated_at", { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);
    if (error || usersResult.error) throw new Error("storage");
    const byUser = new Map((entitlements ?? []).map((row) => [String(row.user_id), publicState(row)]));
    const users = usersResult.data.users.map((user) => ({ id: user.id, email: user.email ?? null, qa: byUser.get(user.id) ?? null }));
    return json({ users });
  } catch { return json({ error: "QAテスト権限を取得できませんでした。" }, 503); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAdminRequest(request);
    if (!auth.user) return json({ error: "管理者権限が必要です。" }, auth.status);
    const body = await request.json() as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!UUID.test(userId)) return json({ error: "ユーザーIDが正しくありません。" }, 400);
    const isEnabled = body.isEnabled === true;
    const expiresAt = body.expiresAt === null || body.expiresAt === undefined || body.expiresAt === "" ? null : new Date(String(body.expiresAt));
    if (expiresAt && Number.isNaN(expiresAt.getTime())) return json({ error: "有効期限が正しくありません。" }, 400);
    if (isEnabled && (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() || expiresAt.getTime() > Date.now() + 31 * 24 * 60 * 60 * 1000)) return json({ error: "有効化には31日以内の将来の有効期限が必要です。" }, 400);
    const bool = (key: string, fallback: boolean) => body[key] === undefined ? fallback : body[key] === true;
    const intOrNull = (key: string, fallback: number | null, min: number, max: number) => {
      if (body[key] === null || body[key] === undefined || body[key] === "") return fallback;
      const value = Number(body[key]);
      return Number.isInteger(value) && value >= min && value <= max ? value : NaN;
    };
    const admin = requireSupabaseAdminClient();
    const { data: existing } = await admin.from("qa_test_entitlements").select("*").eq("user_id", userId).maybeSingle();
    const publicationLimit = intOrNull("publicationLimit", existing?.publication_limit == null ? 1 : Number(existing.publication_limit), 1, 10);
    const quickDailyLimit = intOrNull("quickDailyLimit", existing?.quick_daily_limit == null ? 1 : Number(existing.quick_daily_limit), 1, 30);
    const quickMonthlyLimit = intOrNull("quickMonthlyLimit", existing?.quick_monthly_limit == null ? 3 : Number(existing.quick_monthly_limit), 1, 100);
    const fullDailyLimit = intOrNull("fullDailyLimit", existing?.full_daily_limit == null ? 1 : Number(existing.full_daily_limit), 1, 3);
    const fullMonthlyLimit = intOrNull("fullMonthlyLimit", existing?.full_monthly_limit == null ? 3 : Number(existing.full_monthly_limit), 1, 30);
    if ([publicationLimit, quickDailyLimit, quickMonthlyLimit, fullDailyLimit, fullMonthlyLimit].some(Number.isNaN)) return json({ error: "QA利用枠の値が正しくありません。" }, 400);
    const values = {
      user_id: userId, is_enabled: isEnabled, allow_publish: bool("allowPublish", existing?.allow_publish === true), publication_limit: publicationLimit,
      allow_quick_design: bool("allowQuickDesign", existing?.allow_quick_design !== false), allow_full_design: bool("allowFullDesign", existing?.allow_full_design === true),
      allow_ai_critic: bool("allowAICritic", existing?.allow_ai_critic === true), quick_daily_limit: quickDailyLimit, quick_monthly_limit: quickMonthlyLimit,
      full_daily_limit: fullDailyLimit, full_monthly_limit: fullMonthlyLimit, expires_at: expiresAt?.toISOString() ?? null,
      updated_at: new Date().toISOString(), updated_by: auth.user.id, created_by: existing?.created_by ?? auth.user.id,
      label: typeof body.label === "string" ? body.label.trim().slice(0, 80) : existing?.label ?? "Production QA",
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : existing?.notes ?? null,
    };
    const { data: saved, error: saveError } = await admin.from("qa_test_entitlements").upsert(values, { onConflict: "user_id" }).select("*").single();
    if (saveError) throw new Error("storage");
    const { error: auditError } = await admin.from("qa_test_entitlement_audit").insert({ entitlement_id: saved.id, user_id: userId, changed_by: auth.user.id, previous_state: publicState(existing), new_state: publicState(saved) });
    if (auditError) throw new Error("audit");
    return json({ qa: publicState(saved) });
  } catch { return json({ error: "QAテスト権限を変更できませんでした。" }, 503); }
}
