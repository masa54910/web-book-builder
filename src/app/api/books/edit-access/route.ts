import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { findActiveOperationPlansForUser, hasPublicationEntitlement } from "@/lib/server/planBillingRepository";
import { expectedStripeLivemode } from "@/lib/server/stripeEnvironment";
import { getPublicationEditDecision } from "@/lib/publicationEditWindow";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
  if (!bookId) return NextResponse.json({ error: "作品IDが必要です。" }, { status: 400 });

  const { data: book, error } = await requireSupabaseAdminClient()
    .from("books")
    .select("id, status, first_published_at")
    .eq("id", bookId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "作品の編集権限を確認できません。" }, { status: 500 });
  if (!book) return NextResponse.json({ error: "作品が見つからないか、アクセス権がありません。" }, { status: 404 });

  const livemode = expectedStripeLivemode();
  const [operationPlans, publicationEntitlement] = await Promise.all([
    findActiveOperationPlansForUser(user.id, livemode),
    hasPublicationEntitlement(user.id, bookId, livemode),
  ]);
  const decision = getPublicationEditDecision({
    status: String(book.status),
    firstPublishedAt: book.first_published_at ? String(book.first_published_at) : null,
    hasActivePublicationEntitlement: publicationEntitlement,
    hasActiveOperationPlan: operationPlans.length > 0,
  });
  return NextResponse.json(decision);
}
