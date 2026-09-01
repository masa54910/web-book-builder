import { NextResponse } from "next/server";

import { flattenContentBlocks } from "@/lib/bookProject";
import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { ANALYTICS_EVENT_TYPES, validateAnalyticsEventPayload, type AnalyticsEventPayload, type PublishedAnalyticsRegistry } from "@/lib/analyticsEventValidation";
import { buildReaderPages } from "@/lib/paginateText";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The published payload is paginated once per book/worker and reused for a
// short window. Events never carry contentBlocks and do not trigger a fresh
// pagination pass for every request.
const registryCache = new Map<string, { expiresAt: number; registry: PublishedAnalyticsRegistry }>();
const CACHE_TTL_MS = 60_000;

async function publishedRegistry(bookId: string): Promise<PublishedAnalyticsRegistry | null> {
  const admin = requireSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("books")
    .select("id,status,visibility,deleted_at,book_project_json")
    .eq("id", bookId)
    .eq("status", "published")
    .in("visibility", ["public", "unlisted"])
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !row) return null;
  const project = parseBookProjectJson(row.book_project_json);
  if (!project) return null;
  const revision = Number.isInteger(project.config.publicationRevision) && (project.config.publicationRevision || 0) > 0
    ? Number(project.config.publicationRevision)
    : 1;
  const cached = registryCache.get(bookId);
  if (cached && cached.expiresAt > Date.now() && cached.registry.publicationRevision === revision) return cached.registry;
  const contentBlocks = project.contentBlocks || [];
  const pages = buildReaderPages({
    chapters: project.chapters,
    images: project.images,
    contentBlocks,
    pageAdjustments: project.config.pageAdjustments,
    charactersPerPage: Math.max(180, Number(project.config.charactersPerPage) || 380),
    tableOfContentsItemsPerPage: Math.max(1, Number(project.config.tableOfContentsItemsPerPage) || 6),
    showPaywallPage: true,
  });
  const flatBlocks = flattenContentBlocks(contentBlocks);
  const registry: PublishedAnalyticsRegistry = {
    bookId: String(row.id),
    publicationRevision: revision,
    pages,
    chapterIds: new Set(project.chapters.map((chapter) => chapter.id)),
    chapterIdsByTitle: new Map(project.chapters.map((chapter) => [chapter.title, chapter.id])),
    paywallBlockIds: new Set(flatBlocks.filter((block) => block.type === "paywall").map((block) => block.id)),
  };
  registryCache.set(bookId, { expiresAt: Date.now() + CACHE_TTL_MS, registry });
  return registry;
}

function badRequest() {
  return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 16_384) return badRequest();
    body = JSON.parse(rawBody);
  } catch { return badRequest(); }
  if (!body || typeof body !== "object") return badRequest();
  const raw = body as Record<string, unknown>;
  const bookId = typeof raw.book_id === "string" ? raw.book_id.trim() : "";
  const sessionId = typeof raw.session_id === "string" ? raw.session_id.trim() : "";
  const eventType = typeof raw.event_type === "string" ? raw.event_type : "";
  if (!bookId || !sessionId || !eventType) return badRequest();
  if (sessionId.length < 8 || sessionId.length > 120 || !/^[A-Za-z0-9._:-]+$/u.test(sessionId)) return badRequest();
  if (!ANALYTICS_EVENT_TYPES.includes(eventType as (typeof ANALYTICS_EVENT_TYPES)[number])) return badRequest();
  const payload: AnalyticsEventPayload = {
    bookId,
    sessionId,
    eventType,
    publicationRevision: typeof raw.publication_revision === "number" ? raw.publication_revision : raw.publication_revision == null ? null : undefined,
    readerPageId: typeof raw.reader_page_id === "string" ? raw.reader_page_id : raw.reader_page_id == null ? null : undefined,
    sourceBlockId: typeof raw.source_block_id === "string" ? raw.source_block_id : raw.source_block_id == null ? null : undefined,
    chapterId: typeof raw.chapter_id === "string" ? raw.chapter_id : raw.chapter_id == null ? null : undefined,
    pageIndex: typeof raw.page_index === "number" ? raw.page_index : raw.page_index == null ? null : undefined,
    totalPages: typeof raw.total_pages === "number" ? raw.total_pages : raw.total_pages == null ? null : undefined,
    chapterTitle: typeof raw.chapter_title === "string" ? raw.chapter_title : raw.chapter_title == null ? null : undefined,
    referrerSource: typeof raw.referrer_source === "string" ? raw.referrer_source : raw.referrer_source == null ? null : undefined,
    deviceType: typeof raw.device_type === "string" ? raw.device_type : raw.device_type == null ? null : undefined,
    linkType: typeof raw.link_type === "string" ? raw.link_type : raw.link_type == null ? null : undefined,
  };
  try {
    const registry = await publishedRegistry(bookId);
    if (!registry) return NextResponse.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const validation = validateAnalyticsEventPayload(payload, registry);
    if (!validation.ok) return badRequest();
    const event = validation.normalized;
    const admin = requireSupabaseAdminClient();
    const { error } = await admin.from("book_analytics_events").insert({
      book_id: event.bookId,
      session_id: event.sessionId,
      event_type: event.eventType,
      chapter_title: event.chapterTitle,
      page_index: event.pageIndex,
      total_pages: event.totalPages,
      referrer_source: event.referrerSource,
      device_type: event.deviceType,
      publication_revision: event.publicationRevision,
      reader_page_id: event.readerPageId,
      source_block_id: event.sourceBlockId,
      chapter_id: event.chapterId,
      link_type: event.linkType,
    });
    if (error) return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
