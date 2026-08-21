import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role access is kept separate from the existing anon client. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function requireSupabaseAdminClient(): SupabaseClient {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase server configuration is unavailable.");
  return client;
}
