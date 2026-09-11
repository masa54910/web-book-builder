import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export type QATestEntitlement = {
  id: string;
  userId: string;
  isEnabled: boolean;
  allowPublish: boolean;
  publicationLimit: number | null;
  allowQuickDesign: boolean;
  allowFullDesign: boolean;
  allowAICritic: boolean;
  quickDailyLimit: number | null;
  quickMonthlyLimit: number | null;
  fullDailyLimit: number | null;
  fullMonthlyLimit: number | null;
  expiresAt: string | null;
  label: string | null;
  notes: string | null;
};

function map(row: Record<string, unknown>): QATestEntitlement {
  return {
    id: String(row.id), userId: String(row.user_id), isEnabled: Boolean(row.is_enabled),
    allowPublish: Boolean(row.allow_publish), publicationLimit: row.publication_limit == null ? null : Number(row.publication_limit),
    allowQuickDesign: Boolean(row.allow_quick_design), allowFullDesign: Boolean(row.allow_full_design), allowAICritic: Boolean(row.allow_ai_critic),
    quickDailyLimit: row.quick_daily_limit == null ? null : Number(row.quick_daily_limit), quickMonthlyLimit: row.quick_monthly_limit == null ? null : Number(row.quick_monthly_limit),
    fullDailyLimit: row.full_daily_limit == null ? null : Number(row.full_daily_limit), fullMonthlyLimit: row.full_monthly_limit == null ? null : Number(row.full_monthly_limit),
    expiresAt: row.expires_at ? String(row.expires_at) : null, label: row.label ? String(row.label) : null, notes: row.notes ? String(row.notes) : null,
  };
}

export async function getQATestEntitlement(userId: string): Promise<QATestEntitlement | null> {
  const { data, error } = await requireSupabaseAdminClient().from("qa_test_entitlements").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data || !Boolean(data.is_enabled) || (data.expires_at && new Date(String(data.expires_at)).getTime() <= Date.now())) return null;
  return map(data);
}

export async function getStoredQATestEntitlement(userId: string): Promise<QATestEntitlement | null> {
  const { data, error } = await requireSupabaseAdminClient().from("qa_test_entitlements").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}

export function qaAllowsAICritic(entitlement: QATestEntitlement | null) {
  return Boolean(entitlement?.allowAICritic);
}
