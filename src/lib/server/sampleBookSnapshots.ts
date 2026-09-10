import "server-only";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

const ALLOWED_SAMPLE = "teacher";

export function sanitizeSampleProject(project: Record<string, unknown>) {
  const config = (project.config && typeof project.config === "object" ? project.config : {}) as Record<string, unknown>;
  const safeConfig = { ...config };
  delete safeConfig.bookId; delete safeConfig.ownerId; delete safeConfig.externalSalesUrl; delete safeConfig.priceAmount;
  return { ...project, config: safeConfig, publication: undefined, ownerId: undefined, billing: undefined, analytics: undefined, entitlement: undefined };
}

export async function loadActiveSampleSnapshot(slug: string) {
  if (slug !== ALLOWED_SAMPLE) return null;
  try {
    const { data } = await requireSupabaseAdminClient().from("sample_book_snapshots").select("snapshot_json").eq("sample_slug", slug).eq("is_active", true).maybeSingle();
    return data?.snapshot_json && typeof data.snapshot_json === "object" ? data.snapshot_json as Record<string, unknown> : null;
  } catch { return null; }
}

export async function createOrGetTeacherMaster(userId: string) {
  const admin = requireSupabaseAdminClient();
  const existing = await admin.from("books").select("id,book_project_json").eq("slug", "sample-master-teacher").maybeSingle();
  if (existing.data) return existing.data;
  const { createTemplatePayload } = await import("@/lib/templateBooks");
  const { buildBookProjectFromCanonicalPayload } = await import("@/lib/canonicalBook");
  const payload = createTemplatePayload("teacher");
  payload.title = "はじめての株式投資"; payload.subtitle = "「株って何？」から始める、やさしい投資の教科書"; payload.authorName = "WebBookMaker 教材編集部"; payload.slug = "sample-master-teacher";
  const built = buildBookProjectFromCanonicalPayload(payload); if (!built.ok) throw new Error("Template master validation failed");
  const { data, error } = await admin.from("books").insert({ owner_id: userId, title: payload.title, subtitle: payload.subtitle, author_name: payload.authorName, author_handle: "", description: payload.description, publisher: "WebBookMaker", published_at: "", copyright: "", slug: payload.slug, status: "draft", visibility: "private", binding_direction: "ltr", reader_mode: "book", theme: payload.theme, characters_per_page: payload.charactersPerPage, toc_items_per_page: payload.tableOfContentsItemsPerPage, cover_path: "", raw_text: "", book_project_json: built.project, access_level: "free", monetization_enabled: false }).select("id,book_project_json").single();
  if (error) throw error; return data;
}
