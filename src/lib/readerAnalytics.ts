"use client";

import type { ReaderPage } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase/client";

export type StoredBookAnalytics = {
  bookId: string;
  views: number;
  shares: number;
  completions: number;
  maxPageReached: number;
  totalPages: number;
  chapterViews: Record<string, number>;
  updatedAt: string;
};

const ANALYTICS_KEY_PREFIX = "webBookMaker:analytics:";
const ANALYTICS_SESSION_KEY_PREFIX = "webBookMaker:analyticsSession:";
const ANALYTICS_EVENT_DEDUPE_PREFIX = "webBookMaker:analyticsSent:";

type CloudReaderEvent =
  | "view_start"
  | "reached_25"
  | "reached_50"
  | "reached_75"
  | "completed"
  | "share_click"
  | "external_link_click"
  | "chapter_reached";

function emptyAnalytics(bookId: string): StoredBookAnalytics {
  return {
    bookId,
    views: 0,
    shares: 0,
    completions: 0,
    maxPageReached: 0,
    totalPages: 0,
    chapterViews: {},
    updatedAt: new Date().toISOString(),
  };
}

function storageKey(bookId: string) {
  return `${ANALYTICS_KEY_PREFIX}${bookId}`;
}

function analyticsSessionId(cloudBookId: string) {
  const key = `${ANALYTICS_SESSION_KEY_PREFIX}${cloudBookId}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

function dedupeKey(cloudBookId: string, eventType: CloudReaderEvent, chapterTitle?: string) {
  return `${ANALYTICS_EVENT_DEDUPE_PREFIX}${cloudBookId}:${eventType}:${chapterTitle ?? ""}`;
}

async function recordCloudEvent(
  cloudBookId: string | undefined,
  eventType: CloudReaderEvent,
  payload: Record<string, unknown> = {},
  once = true,
) {
  if (typeof window === "undefined" || !cloudBookId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const key = dedupeKey(cloudBookId, eventType, typeof payload.chapterTitle === "string" ? payload.chapterTitle : undefined);
  try {
    if (once && localStorage.getItem(key)) return;
    const { error } = await supabase.from("book_analytics_events").insert({
      book_id: cloudBookId,
      session_id: analyticsSessionId(cloudBookId),
      event_type: eventType,
      chapter_title: typeof payload.chapterTitle === "string" ? payload.chapterTitle : null,
      page_index: typeof payload.pageIndex === "number" ? payload.pageIndex : null,
      total_pages: typeof payload.totalPages === "number" ? payload.totalPages : null,
    });
    if (!error && once) localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Cloud analytics must never interrupt reading.
  }
}

function read(bookId: string) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(bookId)) ?? "null");
    if (typeof parsed === "object" && parsed !== null && (parsed as StoredBookAnalytics).bookId === bookId) {
      return { ...emptyAnalytics(bookId), ...(parsed as StoredBookAnalytics) };
    }
  } catch {
    // Ignore broken browser storage.
  }
  return emptyAnalytics(bookId);
}

function write(analytics: StoredBookAnalytics) {
  try {
    localStorage.setItem(
      storageKey(analytics.bookId),
      JSON.stringify({ ...analytics, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Analytics is non-critical.
  }
}

export function readBookAnalytics(bookId: string) {
  if (typeof window === "undefined") return emptyAnalytics(bookId);
  return read(bookId);
}

export function recordBookView(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  const analytics = read(bookId);
  analytics.views += 1;
  write(analytics);
  void recordCloudEvent(cloudBookId, "view_start");
}

export function recordShare(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  const analytics = read(bookId);
  analytics.shares += 1;
  write(analytics);
  void recordCloudEvent(cloudBookId, "share_click", {}, false);
}

export function recordExternalLinkClick(bookId: string, cloudBookId?: string) {
  if (typeof window === "undefined") return;
  void bookId;
  void recordCloudEvent(cloudBookId, "external_link_click", {}, false);
}

export function recordReaderProgress(bookId: string, page: ReaderPage | undefined, pageIndex: number, totalPages: number, cloudBookId?: string) {
  if (typeof window === "undefined" || !page) return;
  const analytics = read(bookId);
  analytics.maxPageReached = Math.max(analytics.maxPageReached, pageIndex);
  analytics.totalPages = Math.max(analytics.totalPages, totalPages);
  if ("chapterTitle" in page) {
    analytics.chapterViews[page.chapterTitle] = (analytics.chapterViews[page.chapterTitle] ?? 0) + 1;
    void recordCloudEvent(
      cloudBookId,
      "chapter_reached",
      { chapterTitle: page.chapterTitle, pageIndex, totalPages },
    );
  }
  const progress = totalPages > 0 ? pageIndex / Math.max(1, totalPages - 1) : 0;
  if (progress >= 0.25) void recordCloudEvent(cloudBookId, "reached_25", { pageIndex, totalPages });
  if (progress >= 0.5) void recordCloudEvent(cloudBookId, "reached_50", { pageIndex, totalPages });
  if (progress >= 0.75) void recordCloudEvent(cloudBookId, "reached_75", { pageIndex, totalPages });
  if (totalPages > 0 && pageIndex >= totalPages - 2) {
    analytics.completions += 1;
    void recordCloudEvent(cloudBookId, "completed", { pageIndex, totalPages });
  }
  write(analytics);
}

export function summarizeAnalytics(bookId: string) {
  const analytics = readBookAnalytics(bookId);
  const completionRate = analytics.views
    ? Math.round((analytics.completions / analytics.views) * 100)
    : 0;
  const popularChapters = Object.entries(analytics.chapterViews)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([title, views]) => ({ title, views }));
  return { ...analytics, completionRate, popularChapters };
}

export async function summarizeCloudAnalytics(cloudBookId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("book_analytics_events")
    .select("event_type, chapter_title")
    .eq("book_id", cloudBookId)
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ event_type: string; chapter_title: string | null }>;
  const views = rows.filter((row) => row.event_type === "view_start").length;
  const completions = rows.filter((row) => row.event_type === "completed").length;
  const shares = rows.filter((row) => row.event_type === "share_click").length;
  const externalLinkClicks = rows.filter((row) => row.event_type === "external_link_click").length;
  const chapterViews = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "chapter_reached" || !row.chapter_title) continue;
    chapterViews.set(row.chapter_title, (chapterViews.get(row.chapter_title) ?? 0) + 1);
  }
  return {
    views,
    completions,
    completionRate: views ? Math.round((completions / views) * 100) : 0,
    shares,
    externalLinkClicks,
    popularChapters: [...chapterViews.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, views: count })),
  };
}
