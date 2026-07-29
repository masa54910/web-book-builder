"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/appEnv";

let cachedClient: SupabaseClient | null | undefined;

export { isSupabaseConfigured };

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient !== undefined) return cachedClient;
  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cachedClient;
}

export function getRequiredSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase環境変数が未設定です。Preview/Productionでは保存できません。");
  }
  return client;
}
