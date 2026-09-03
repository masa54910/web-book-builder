import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Authenticate API requests with the caller's Supabase access token. */
export async function requireAuthenticatedUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase server configuration is unavailable.");

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return null;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
