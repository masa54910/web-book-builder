import { getSupabaseClient } from "@/lib/supabase/client";
export async function fullDesignRequest(path: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const client = getSupabaseClient();
  const session = client ? await client.auth.getSession() : null;
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("ログイン状態を確認してください。");
  const response = await fetch(path, {
    method, signal, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "処理を完了できませんでした。");
  return data;
}
