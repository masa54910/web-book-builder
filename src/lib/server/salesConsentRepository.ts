import "server-only";

import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const CONNECT_TERMS_VERSION = "gate18c4-v1";

export type SalesConsent = { userId: string; termsVersion: string; acceptedAt: string; updatedAt: string };

function map(row: Record<string, unknown>): SalesConsent {
  return { userId: String(row.user_id), termsVersion: String(row.terms_version), acceptedAt: String(row.accepted_at), updatedAt: String(row.updated_at) };
}

export async function getSalesConsent(userId: string) {
  const { data, error } = await requireSupabaseAdminClient().from("author_sales_consents").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}

export async function saveSalesConsent(userId: string, termsVersion = CONNECT_TERMS_VERSION) {
  const { data, error } = await requireSupabaseAdminClient().from("author_sales_consents").upsert({ user_id: userId, terms_version: termsVersion, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("*").single();
  if (error) throw error;
  return map(data);
}
