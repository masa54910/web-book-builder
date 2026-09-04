import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    const { data, error } = await requireSupabaseAdminClient().from("books").select("id,title,status,slug").eq("owner_id", user.id).is("deleted_at", null).order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ books: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "作品一覧を取得できませんでした。" }, { status: 503 }); }
}
