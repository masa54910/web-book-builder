"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/appEnv";

let cachedClient: SupabaseClient | null | undefined;

const diagnosticFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = String(input);
  const tracked =
    url.includes("/rest/v1/books") ||
    url.includes("/rest/v1/book_images") ||
    url.includes("/rest/v1/book_external_links") ||
    url.includes("/storage/v1/object/book-assets");
  if (tracked) {
    const diagnostic: Record<string, unknown> = {
      method: init?.method || "GET",
      url,
      status: response.status,
      ok: response.ok,
    };
    if (!response.ok) {
      try {
        diagnostic.body = await response.clone().json();
      } catch {
        // Keep the status and URL when the response is not JSON.
      }
    }
    console.info("[supabase-http]", JSON.stringify(diagnostic));
  }
  return response;
};

export { isSupabaseConfigured };

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient !== undefined) return cachedClient;
  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: diagnosticFetch } },
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
