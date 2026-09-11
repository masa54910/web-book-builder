import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { isPlainRecord, readFullDesignRequest } from "@/lib/fullDesignContract";
import { parseMyDesignGrammar } from "@/lib/myDesigns";

const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return json({ error: "認証が必要です。" }, 401);
    const { data, error } = await requireSupabaseAdminClient().from("my_designs").select("id,name,grammar,created_at,updated_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("storage");
    const designs = (data ?? []).flatMap((row) => {
      const grammar = parseMyDesignGrammar(row.grammar);
      return grammar ? [{ id: row.id, name: row.name, grammar, createdAt: row.created_at, updatedAt: row.updated_at }] : [];
    });
    return json({ designs });
  } catch { return json({ error: "マイデザインを読み込めませんでした。" }, 503); }
}
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return json({ error: "認証が必要です。" }, 401);
    const body = await readFullDesignRequest(request);
    if (!isPlainRecord(body) || Object.keys(body).some((key) => !["name", "grammar"].includes(key))) return json({ error: "入力内容が正しくありません。" }, 400);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const grammar = parseMyDesignGrammar(body.grammar);
    if (!name || name.length > 80 || !grammar) return json({ error: "デザイン名と方針を確認してください。" }, 400);
    const { data, error } = await requireSupabaseAdminClient().from("my_designs").insert({ owner_id: user.id, name, grammar }).select("id").single();
    if (error) throw new Error("storage");
    return json({ id: data.id }, 201);
  } catch { return json({ error: "マイデザインを保存できませんでした。" }, 503); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return json({ error: "認証が必要です。" }, 401);
    const body = await readFullDesignRequest(request);
    if (!isPlainRecord(body) || Object.keys(body).some((key) => !["id", "name"].includes(key)) || typeof body.id !== "string" || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) return json({ error: "入力内容が正しくありません。" }, 400);
    const { data, error } = await requireSupabaseAdminClient().from("my_designs").update({ name: body.name.trim(), updated_at: new Date().toISOString() }).eq("id", body.id).eq("owner_id", user.id).select("id").maybeSingle();
    if (error) throw new Error("storage");
    return data ? json({ id: data.id }) : json({ error: "デザインが見つかりません。" }, 404);
  } catch { return json({ error: "名前を変更できませんでした。" }, 503); }
}
export async function DELETE(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return json({ error: "認証が必要です。" }, 401);
    const body = await readFullDesignRequest(request);
    if (!isPlainRecord(body) || typeof body.id !== "string" || Object.keys(body).length !== 1) return json({ error: "入力内容が正しくありません。" }, 400);
    const { data, error } = await requireSupabaseAdminClient().from("my_designs").delete().eq("id", body.id).eq("owner_id", user.id).select("id").maybeSingle();
    if (error) throw new Error("storage");
    return data ? json({ id: data.id }) : json({ error: "デザインが見つかりません。" }, 404);
  } catch { return json({ error: "削除できませんでした。" }, 503); }
}
