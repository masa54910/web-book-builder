import "server-only";

import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const AI_BOOK_DESIGNER_PLAN_CODES = ["free", "publication", "operation_standard", "operation"] as const;
export type AIBookDesignerPlanCode = (typeof AI_BOOK_DESIGNER_PLAN_CODES)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type AIBookDesignerQuotaScope = {
  planCode: AIBookDesignerPlanCode;
  bookId: string | null;
};

/**
 * Resolve the server-owned plan entitlement used by the AI quota RPC.
 * Publication quota is scoped to an owned, persisted book. New-book drafts
 * intentionally cannot create a new lifetime bucket; subscription/free quota
 * remains available while the formal book identity does not yet exist.
 */
export async function resolveAIBookDesignerQuotaScope(userId: string, requestedBookId: unknown): Promise<AIBookDesignerQuotaScope> {
  const candidateBookId = typeof requestedBookId === "string" && UUID_PATTERN.test(requestedBookId.trim())
    ? requestedBookId.trim()
    : null;
  const admin = requireSupabaseAdminClient();
  const livemode = expectedStripeLivemode();

  let ownedBookId: string | null = null;
  if (candidateBookId) {
    const { data: ownedBook, error: bookError } = await admin
      .from("books")
      .select("id")
      .eq("id", candidateBookId)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (bookError) throw bookError;
    ownedBookId = ownedBook ? candidateBookId : null;
  }

  const { data, error } = await admin
    .from("plan_entitlements")
    .select("plan_code, book_id")
    .eq("user_id", userId)
    .eq("livemode", livemode)
    .eq("status", "active")
    .in("plan_code", ["publication", "operation_standard", "operation"]);
  if (error) throw error;

  const entitlements = data ?? [];
  const plus = entitlements.some((row) => row.plan_code === "operation");
  if (plus) return { planCode: "operation", bookId: null };
  const standard = entitlements.some((row) => row.plan_code === "operation_standard");
  if (standard) return { planCode: "operation_standard", bookId: null };
  const publication = entitlements.some((row) => row.plan_code === "publication" && row.book_id === ownedBookId);
  if (publication && ownedBookId) return { planCode: "publication", bookId: ownedBookId };
  return { planCode: "free", bookId: null };
}

