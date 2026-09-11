import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { generateFullDesign, ZERO_DESIGN_USAGE } from "@/lib/fullDesignPipeline";
import { isPlainRecord, parseFullDesignBrief, readFullDesignRequest } from "@/lib/fullDesignContract";
import { finishFullDesign, FullDesignAccessError, fullDesignAPIEnabled, recordZeroAPIDesign, requireFullDesignEditAccess, reserveFullDesign } from "@/lib/server/fullDesignControl";
import { fullDesignSelector, fullDesignCritic } from "@/lib/server/fullDesignProvider";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { parseMyDesignGrammar } from "@/lib/myDesigns";
import { DESIGN_SYSTEM_LIBRARY } from "@/lib/designSystemLibrary";
import { getQATestEntitlement } from "@/lib/server/qaEntitlement";

export const maxDuration = 120;
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  try {
    if (!await requireAuthenticatedUser(request)) return fail("認証が必要です。", 401);
    return NextResponse.json({ apiEnabled: await fullDesignAPIEnabled() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return fail("設定を確認できませんでした。", 503); }
}

export async function POST(request: Request) {
  const start = Date.now();
  let runId: string | null = null;
  let userId: string | null = null;
  let usage = { ...ZERO_DESIGN_USAGE };
  let model: string | null = null;
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return fail("認証が必要です。", 401);
    userId = user.id;
    let body: unknown;
    try { body = await readFullDesignRequest(request); }
    catch { return fail("デザインの入力内容またはサイズを確認してください。", 400); }
    if (!isPlainRecord(body) || Object.keys(body).some((key) => !["brief", "bookProfile", "bookId", "myDesignId"].includes(key))) return fail("入力内容が正しくありません。", 400);
    const scope = await requireFullDesignEditAccess(user.id, body.bookId);
    const qaEntitlement = await getQATestEntitlement(user.id);
    if (body.myDesignId !== undefined) {
      if (typeof body.myDesignId !== "string" || body.myDesignId.length > 50) return fail("デザインIDが正しくありません。", 400);
      const { data, error } = await requireSupabaseAdminClient().from("my_designs").select("grammar").eq("id", body.myDesignId).eq("owner_id", user.id).maybeSingle();
      if (error || !data) return fail("デザインが見つかりません。", 404);
      const grammar = parseMyDesignGrammar(data.grammar);
      if (!grammar) return fail("このデザインは利用できません。", 400);
      await recordZeroAPIDesign(user.id, scope.planCode, "my-design", Date.now() - start);
      return NextResponse.json({
        version: 1, mode: "my-design", spec: grammar.spec, selectedDesignSystemId: grammar.baseSystemId,
        selectedDesignSystemName: DESIGN_SYSTEM_LIBRARY.find((system) => system.id === grammar.baseSystemId)?.name,
        usage: { ...ZERO_DESIGN_USAGE }, model: null, brief: grammar.brief,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    const brief = parseFullDesignBrief(body.brief);
    if (!brief) return fail("デザイン方針を確認してください。", 400);
    // The persisted admin setting is authoritative. Browser flags are not accepted.
    let apiEnabled = await fullDesignAPIEnabled();
    if (apiEnabled) {
      if (process.env.AI_BOOK_DESIGNER_ENABLED !== "true") return fail("AIデザイン機能は現在利用できません。", 503);
      runId = await reserveFullDesign(user.id, scope.planCode);
      apiEnabled = runId !== null; // Admin may have switched OFF during validation.
    }
    const recordUsage = (measured: typeof usage, measuredModel: string) => {
      usage = { inputTokens: usage.inputTokens + measured.inputTokens, outputTokens: usage.outputTokens + measured.outputTokens, cachedTokens: usage.cachedTokens + measured.cachedTokens };
      model = measuredModel;
    };
    const result = await generateFullDesign({
      brief, profile: body.bookProfile, apiEnabled,
      select: fullDesignSelector(recordUsage),
      critique: process.env.AI_FULL_DESIGN_CRITIC_ENABLED === "true" && (!qaEntitlement || qaEntitlement.allowAICritic) ? fullDesignCritic(recordUsage) : undefined,
    });
    if (runId) {
      await finishFullDesign({ runId, userId: user.id, success: true, usage, model, latency: Date.now() - start });
      runId = null;
    } else await recordZeroAPIDesign(user.id, scope.planCode, "api-off", Date.now() - start);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (runId && userId) {
      await finishFullDesign({ runId, userId, success: false, usage, model, latency: Date.now() - start,
        failure: error instanceof Error && error.name === "TimeoutError" ? "timeout" : error instanceof Error && error.message.startsWith("provider") ? "provider" : "validation",
      }).catch(() => console.error("full-design reservation finalization failed"));
    }
    if (error instanceof FullDesignAccessError) return fail(error.safeMessage, error.status);
    console.error("full-design generation failed"); // Never log request/provider text.
    return fail("デザインを生成できませんでした。少し時間を空けてもう一度お試しください。", 502);
  }
}
