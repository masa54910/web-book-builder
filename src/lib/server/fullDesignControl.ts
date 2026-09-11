import "server-only";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { findActiveOperationPlansForUser, hasPublicationEntitlement } from "@/lib/server/planBillingRepository";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { getPublicationEditDecision } from "@/lib/publicationEditWindow";
import { resolveAIBookDesignerQuotaScope } from "@/lib/server/aiBookDesignerQuota";
import type { DesignTokenUsage, FullDesignMode } from "@/lib/fullDesignPipeline";

export async function fullDesignAPIEnabled(): Promise<boolean> {
  try {
    const { data, error } = await requireSupabaseAdminClient().from("full_design_settings").select("value").eq("key", "ai_full_design_api_enabled").maybeSingle();
    return !error && data?.value === true;
  } catch { return false; }
}

export class FullDesignAccessError extends Error {
  constructor(public status: number, public safeMessage: string) { super("full-design-access"); }
}

export async function requireFullDesignEditAccess(userId: string, bookId: unknown) {
  if (bookId !== null && bookId !== undefined) {
    if (typeof bookId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookId)) throw new FullDesignAccessError(400, "作品IDが正しくありません。");
    const { data: book, error } = await requireSupabaseAdminClient().from("books")
      .select("id,status,first_published_at").eq("id", bookId).eq("owner_id", userId).is("deleted_at", null).maybeSingle();
    if (error) throw new Error("access-lookup");
    if (!book) throw new FullDesignAccessError(404, "作品が見つからないか、アクセス権がありません。");
    const live = expectedStripeLivemode();
    const [operation, publication] = await Promise.all([
      findActiveOperationPlansForUser(userId, live), hasPublicationEntitlement(userId, bookId, live),
    ]);
    const decision = getPublicationEditDecision({
      status: String(book.status), firstPublishedAt: book.first_published_at,
      hasActivePublicationEntitlement: publication, hasActiveOperationPlan: operation.length > 0,
    });
    if (!decision.allowed) throw new FullDesignAccessError(403, "この作品の編集可能期間は終了しています。");
  }
  return resolveAIBookDesignerQuotaScope(userId, bookId);
}

export async function reserveFullDesign(userId: string, plan: string) {
  const { data, error } = await requireSupabaseAdminClient().rpc("reserve_full_design_run", { p_owner_id: userId, p_plan_code: plan });
  if (error) throw new Error("quota-storage");
  if (data?.allowed !== true) {
    if (data?.reason === "api-off") return null;
    throw new FullDesignAccessError(data?.reason === "unconfigured" ? 503 : 429,
      data?.reason === "unconfigured" ? "AIフルデザインの利用枠は現在準備中です。" : "フルデザインの利用上限に達しました。時間を空けて再度お試しください。");
  }
  if (typeof data.run_id !== "string") throw new Error("quota-result");
  return data.run_id;
}

export async function finishFullDesign(input: {
  runId: string; userId: string; success: boolean; model: string | null; usage: DesignTokenUsage; latency: number;
  failure?: "provider" | "validation" | "timeout" | "internal";
}) {
  const { data, error } = await requireSupabaseAdminClient().rpc("finish_full_design_run", {
    p_id: input.runId, p_owner_id: input.userId, p_success: input.success, p_model: input.model,
    p_input: input.usage.inputTokens, p_output: input.usage.outputTokens, p_cached: input.usage.cachedTokens,
    p_latency: Math.min(2147483647, Math.max(0, Math.round(input.latency))), p_failure: input.failure ?? null,
  });
  if (error || data !== true) throw new Error("telemetry-finish");
}

export async function recordZeroAPIDesign(userId: string, plan: string, mode: Exclude<FullDesignMode, "api-on">, latency: number) {
  const { error } = await requireSupabaseAdminClient().from("full_design_runs").insert({
    owner_id: userId, plan_code: plan, mode, status: "success", model: null,
    input_tokens: 0, output_tokens: 0, cached_tokens: 0, latency_ms: Math.max(0, Math.round(latency)), finished_at: new Date().toISOString(),
  });
  // Telemetry outage must not turn OFF mode into an API call or break editing.
  if (error) console.error("full-design telemetry unavailable mode=api-off");
}
