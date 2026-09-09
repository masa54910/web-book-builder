import { NextResponse } from "next/server";
import { getBookTemplate } from "@/lib/templateCatalog";
import { createTemplatePayload } from "@/lib/templateBooks";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { getBookCreationLimitForUser } from "@/lib/server/planBillingRepository";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

/** Returns a fresh starter only. Persistence uses the existing owner-scoped save command. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
    const { id } = await params;
    if (!getBookTemplate(id)) return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
    const limit = await getBookCreationLimitForUser(user.id, expectedStripeLivemode());
    const { count, error } = await requireSupabaseAdminClient().from("books").select("id", { count: "exact", head: true }).eq("owner_id", user.id).is("deleted_at", null).neq("status", "archived");
    if (error) throw error;
    if ((count ?? 0) >= limit) return NextResponse.json({ error: "作成できる作品数の上限に達しています。" }, { status: 409 });
    return NextResponse.json({ payload: createTemplatePayload(id) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "テンプレートを読み込めませんでした。" }, { status: 503 }); }
}
