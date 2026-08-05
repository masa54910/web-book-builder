"use client";

import type { BookProject } from "@/lib/bookProject";
import { DEFAULT_PUBLICATION_SETTINGS, type BookStatus, type BookVisibility } from "@/lib/accessControl";
import { BETA_LIMITS } from "@/lib/limits";
import { isDemoModeAllowed } from "@/lib/appEnv";
import { createSlugCandidate, makeUniqueSlug } from "@/lib/slug";
import { getSupabaseClient } from "@/lib/supabase/client";
import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { logSupabaseIssue } from "@/lib/supabaseDebug";

export type CloudBookRecord = {
  id: string;
  ownerId: string;
  title: string;
  subtitle: string;
  authorName: string;
  authorHandle: string;
  description: string;
  publisher: string;
  publishedAt: string;
  copyright: string;
  slug: string;
  status: BookStatus;
  visibility: BookVisibility;
  bindingDirection: "rtl" | "ltr";
  theme: BookProject["config"]["theme"];
  charactersPerPage: number;
  tocItemsPerPage: number;
  coverPath: string;
  rawText: string;
  bookProject: BookProject;
  version: number;
  monetizationEnabled: boolean;
  priceAmount: number | null;
  currency: "JPY" | "USD";
  previewMode: "none" | "chapters" | "pages" | "percent";
  previewValue: number | null;
  createdAt: string;
  updatedAt: string;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  deletedAt: string | null;
};

const LOCAL_BOOKS_KEY = "webBookMaker:demo:books";

function assertLocalFallbackAllowed() {
  if (!isDemoModeAllowed()) {
    throw new Error("Supabase接続が必要です。Preview/Productionではローカルデモ保存を使用できません。");
  }
}

function canUseLocalSchemaFallback() {
  return isDemoModeAllowed();
}

function canFallbackToLocal() {
  return canUseLocalSchemaFallback();
}

function now() {
  return new Date().toISOString();
}

function browserId() {
  return Math.random().toString(36).slice(2, 10);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readLocalBooks(): CloudBookRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_BOOKS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((book): book is CloudBookRecord => {
      return (
        typeof book === "object" &&
        book !== null &&
        typeof (book as CloudBookRecord).id === "string" &&
        Boolean(parseBookProjectJson((book as CloudBookRecord).bookProject))
      );
    });
  } catch {
    return [];
  }
}

function writeLocalBooks(books: CloudBookRecord[]) {
  localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books));
}

function toRecord(
  project: BookProject,
  ownerId: string,
  existing?: CloudBookRecord,
  desiredSlug?: string,
): CloudBookRecord {
  const timestamp = now();
  const usedSlugs = new Set(
    isDemoModeAllowed()
      ? readLocalBooks()
          .filter((book) => book.id !== existing?.id)
          .map((book) => book.slug)
      : [],
  );
  const requestedSlug = desiredSlug || existing?.slug || createSlugCandidate(project.config.title);
  // A title without ASCII letters (for example a Japanese-only title) maps to
  // the production-safe fallback "book". New books still need a globally
  // unique slug, so add a short client-generated suffix for that fallback.
  // Existing books keep their current slug, and explicit non-fallback slugs
  // continue through the normal uniqueness/validation path.
  const slugBase = !existing && requestedSlug === "book" ? `book-${browserId()}` : requestedSlug;
  const slug = makeUniqueSlug(slugBase, usedSlugs);

  return {
    id: existing?.id || `book-${browserId()}`,
    ownerId,
    title: project.config.title,
    subtitle: project.config.subtitle,
    authorName: project.config.author,
    authorHandle: project.config.authorProfile?.handle || createSlugCandidate(project.config.author),
    description: project.config.description,
    publisher: project.config.publisherName,
    publishedAt: project.config.publishedAt,
    copyright: project.config.copyrightText,
    slug,
    status: existing?.status || "draft",
    visibility: existing?.visibility || "private",
    bindingDirection: project.config.bindingDirection,
    theme: project.config.theme,
    charactersPerPage: project.config.charactersPerPage,
    tocItemsPerPage: project.config.tableOfContentsItemsPerPage,
    coverPath: project.config.coverImage || "",
    rawText: project.rawText,
    bookProject: project,
    version: project.version,
    monetizationEnabled: existing?.monetizationEnabled ?? DEFAULT_PUBLICATION_SETTINGS.monetizationEnabled,
    priceAmount: existing?.priceAmount ?? DEFAULT_PUBLICATION_SETTINGS.priceAmount,
    currency: existing?.currency ?? DEFAULT_PUBLICATION_SETTINGS.currency,
    previewMode: existing?.previewMode ?? DEFAULT_PUBLICATION_SETTINGS.previewMode,
    previewValue: existing?.previewValue ?? DEFAULT_PUBLICATION_SETTINGS.previewValue,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    firstPublishedAt: existing?.firstPublishedAt ?? null,
    lastPublishedAt: existing?.lastPublishedAt ?? null,
    deletedAt: existing?.deletedAt ?? null,
  };
}

function mapSupabaseBook(row: Record<string, unknown>): CloudBookRecord | null {
  const project = parseBookProjectJson(row.book_project_json);
  if (!project) return null;
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    authorName: String(row.author_name ?? ""),
    authorHandle:
      String(row.author_handle ?? "") ||
      project.config.authorProfile?.handle ||
      createSlugCandidate(String(row.author_name ?? "")),
    description: String(row.description ?? ""),
    publisher: String(row.publisher ?? ""),
    publishedAt: String(row.published_at ?? ""),
    copyright: String(row.copyright ?? ""),
    slug: String(row.slug ?? ""),
    status: (row.status as BookStatus) ?? "draft",
    visibility: (row.visibility as BookVisibility) ?? "private",
    bindingDirection: row.binding_direction === "ltr" ? "ltr" : "rtl",
    theme:
      row.theme === "modern" ||
      row.theme === "minimal" ||
      row.theme === "magazine" ||
      row.theme === "novel" ||
      row.theme === "photo" ||
      row.theme === "research" ||
      row.theme === "portfolio"
        ? row.theme
        : "classic",
    charactersPerPage: Number(row.characters_per_page ?? 380),
    tocItemsPerPage: Number(row.toc_items_per_page ?? 6),
    coverPath: String(row.cover_path ?? ""),
    rawText: String(row.raw_text ?? ""),
    bookProject: project,
    version: Number(row.version ?? 1),
    monetizationEnabled: Boolean(row.monetization_enabled),
    priceAmount: typeof row.price_amount === "number" ? row.price_amount : null,
    currency: row.currency === "USD" ? "USD" : "JPY",
    previewMode:
      row.preview_mode === "chapters" || row.preview_mode === "pages" || row.preview_mode === "percent"
        ? row.preview_mode
        : "none",
    previewValue: typeof row.preview_value === "number" ? row.preview_value : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    firstPublishedAt: row.first_published_at ? String(row.first_published_at) : null,
    lastPublishedAt: row.last_published_at ? String(row.last_published_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

async function syncBookSideTables(book: CloudBookRecord) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error: deleteImagesError } = await supabase
    .from("book_images")
    .delete()
    .eq("book_id", book.id)
    .eq("owner_id", book.ownerId);
  if (deleteImagesError) {
    logSupabaseIssue({ processingName: "saveBook", target: "book_images.delete", error: deleteImagesError });
    throw deleteImagesError;
  }

  if (book.bookProject.images.length) {
    const { error } = await supabase.from("book_images").insert(
      book.bookProject.images.map((image, index) => ({
        book_id: book.id,
        owner_id: book.ownerId,
        image_key: image.image_id || image.image_index || `image-${index + 1}`,
        storage_path: image.image_url,
        caption: image.caption,
        chapter_id: String(image.chapter_order || ""),
        sort_order: index + 1,
      })),
    );
    if (error) {
      logSupabaseIssue({ processingName: "saveBook", target: "book_images.insert", error });
      throw error;
    }
  }

  const { error: deleteLinksError } = await supabase
    .from("book_external_links")
    .delete()
    .eq("book_id", book.id)
    .eq("owner_id", book.ownerId);
  if (deleteLinksError) {
    logSupabaseIssue({ processingName: "saveBook", target: "book_external_links.delete", error: deleteLinksError });
    throw deleteLinksError;
  }

  const links = book.bookProject.config.externalLinks ?? [];
  if (links.length) {
    const { error } = await supabase.from("book_external_links").insert(
      links.map((link, index) => ({
        book_id: book.id,
        owner_id: book.ownerId,
        label: link.label,
        url: link.url,
        link_type: link.type,
        sort_order: index + 1,
        is_enabled: true,
      })),
    );
    if (error) {
      logSupabaseIssue({ processingName: "saveBook", target: "book_external_links.insert", error });
      throw error;
    }
  }
}

export async function listBooks(ownerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return readLocalBooks().filter((book) => book.ownerId === ownerId && !book.deletedAt);
  }
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapSupabaseBook(row)).filter((book): book is CloudBookRecord => Boolean(book));
  } catch (error) {
    if (!canFallbackToLocal()) throw error;
    return readLocalBooks().filter((book) => book.ownerId === ownerId && !book.deletedAt);
  }
}

export async function getBook(id: string, ownerId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return readLocalBooks().find((book) => book.id === id && !book.deletedAt && (!ownerId || book.ownerId === ownerId)) ?? null;
  }
  if (!looksLikeUuid(id)) {
    if (!canUseLocalSchemaFallback()) return null;
    return readLocalBooks().find((book) => book.id === id && !book.deletedAt && (!ownerId || book.ownerId === ownerId)) ?? null;
  }
  try {
    let query = supabase.from("books").select("*").eq("id", id).is("deleted_at", null).limit(1);
    if (ownerId) query = query.eq("owner_id", ownerId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapSupabaseBook(data) : null;
  } catch (error) {
    if (!canFallbackToLocal()) throw error;
    return readLocalBooks().find((book) => book.id === id && !book.deletedAt && (!ownerId || book.ownerId === ownerId)) ?? null;
  }
}

export async function getPublishedBookBySlug(slug: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return (
      readLocalBooks().find(
        (book) =>
          book.slug === slug &&
          book.status === "published" &&
          (book.visibility === "public" || book.visibility === "unlisted") &&
          !book.deletedAt,
      ) ?? null
    );
  }
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .in("visibility", ["public", "unlisted"])
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSupabaseBook(data) : null;
  } catch (error) {
    if (!canFallbackToLocal()) throw error;
    return (
      readLocalBooks().find(
        (book) =>
          book.slug === slug &&
          book.status === "published" &&
          (book.visibility === "public" || book.visibility === "unlisted") &&
          !book.deletedAt,
      ) ?? null
    );
  }
}

export async function listPublishedBooksByAuthorHandle(handle: string) {
  const normalized = handle.replace(/^@+/, "").toLowerCase();
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return readLocalBooks()
      .filter(
        (book) =>
          book.authorHandle === normalized &&
          book.status === "published" &&
          (book.visibility === "public" || book.visibility === "unlisted") &&
          !book.deletedAt,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("author_handle", normalized)
      .eq("status", "published")
      .in("visibility", ["public", "unlisted"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapSupabaseBook(row)).filter((book): book is CloudBookRecord => Boolean(book));
  } catch (error) {
    if (!canFallbackToLocal()) throw error;
    return readLocalBooks()
      .filter(
        (book) =>
          book.authorHandle === normalized &&
          book.status === "published" &&
          (book.visibility === "public" || book.visibility === "unlisted") &&
          !book.deletedAt,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
}

export async function saveBook(
  project: BookProject,
  ownerId: string,
  existingId?: string,
  desiredSlug?: string,
) {
  const existing = existingId ? await getBook(existingId, ownerId) : null;
  if (project.rawText.length > BETA_LIMITS.maxCharactersPerBook) {
    throw new Error(`本文は最大${BETA_LIMITS.maxCharactersPerBook.toLocaleString("ja-JP")}文字までです。`);
  }
  if (project.images.length > BETA_LIMITS.maxImagesPerBook) {
    throw new Error(`画像は最大${BETA_LIMITS.maxImagesPerBook}枚までです。`);
  }

  const record = toRecord(project, ownerId, existing ?? undefined, desiredSlug);
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    const books = readLocalBooks().filter((book) => book.ownerId === ownerId && !book.deletedAt);
    if (!existing && books.length >= BETA_LIMITS.maxBooksPerUser) {
      throw new Error(`ベータ版では1ユーザー最大${BETA_LIMITS.maxBooksPerUser}作品まで作成できます。`);
    }
    const next = readLocalBooks().filter((book) => book.id !== record.id);
    next.push(record);
    writeLocalBooks(next);
    return record;
  }

  try {
    if (!existing) {
      const { count, error: countError } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .is("deleted_at", null);
        if (countError) {
          logSupabaseIssue({ processingName: "saveBook", target: "books.count", error: countError });
          throw countError;
        }
      if ((count ?? 0) >= BETA_LIMITS.maxBooksPerUser) {
        throw new Error(`ベータ版では1ユーザー最大${BETA_LIMITS.maxBooksPerUser}作品まで作成できます。`);
      }
    }

    const payload = {
      id: record.id.startsWith("book-") ? undefined : record.id,
      owner_id: ownerId,
      title: record.title,
      subtitle: record.subtitle,
      author_name: record.authorName,
      author_handle: record.authorHandle,
      description: record.description,
      publisher: record.publisher,
      published_at: record.publishedAt,
      copyright: record.copyright,
      slug: record.slug,
      status: record.status,
      visibility: record.visibility,
      binding_direction: record.bindingDirection,
      theme: record.theme,
      characters_per_page: record.charactersPerPage,
      toc_items_per_page: record.tocItemsPerPage,
      cover_path: record.coverPath,
      raw_text: record.rawText,
      book_project_json: record.bookProject,
      version: record.version,
      monetization_enabled: record.monetizationEnabled,
      price_amount: record.priceAmount,
      currency: record.currency,
      preview_mode: record.previewMode,
      preview_value: record.previewValue,
      updated_at: record.updatedAt,
    };
    const { data, error } = await supabase.from("books").upsert(payload).select("*").single();
    if (error) {
      logSupabaseIssue({ processingName: "saveBook", target: "books.upsert", error });
      throw error;
    }
    const saved = mapSupabaseBook(data) ?? record;
    await syncBookSideTables(saved);
    return saved;
  } catch (error) {
    logSupabaseIssue({ processingName: "saveBook", target: "books.catch", error });
    if (!canFallbackToLocal()) throw error;
    const books = readLocalBooks().filter((book) => book.ownerId === ownerId && !book.deletedAt);
    if (!existing && books.length >= BETA_LIMITS.maxBooksPerUser) {
      throw new Error(`ベータ版では1ユーザー最大${BETA_LIMITS.maxBooksPerUser}作品まで作成できます。`);
    }
    const next = readLocalBooks().filter((book) => book.id !== record.id);
    next.push(record);
    writeLocalBooks(next);
    return record;
  }
}

export async function updatePublication(
  bookId: string,
  ownerId: string,
  changes: Partial<Pick<CloudBookRecord, "status" | "visibility" | "slug">>,
) {
  const book = await getBook(bookId, ownerId);
  if (!book) throw new Error("作品が見つかりません。");
  const timestamp = now();
  const next: CloudBookRecord = {
    ...book,
    ...changes,
    updatedAt: timestamp,
    firstPublishedAt:
      changes.status === "published" && !book.firstPublishedAt ? timestamp : book.firstPublishedAt,
    lastPublishedAt: changes.status === "published" ? timestamp : book.lastPublishedAt,
  };
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    writeLocalBooks(readLocalBooks().map((item) => (item.id === next.id ? next : item)));
    return next;
  }
  try {
    const { data, error } = await supabase
      .from("books")
      .update({
        status: next.status,
        visibility: next.visibility,
        slug: next.slug,
        first_published_at: next.firstPublishedAt,
        last_published_at: next.lastPublishedAt,
        updated_at: next.updatedAt,
      })
      .eq("id", next.id)
      .eq("owner_id", ownerId)
      .select("*")
      .single();
    if (error) {
      logSupabaseIssue({ processingName: "updatePublication", target: "books.update", error });
      throw error;
    }
    return mapSupabaseBook(data) ?? next;
  } catch (error) {
    logSupabaseIssue({ processingName: "updatePublication", target: "books.catch", error });
    if (!canFallbackToLocal()) throw error;
    writeLocalBooks(readLocalBooks().map((item) => (item.id === next.id ? next : item)));
    return next;
  }
}

export async function duplicateBook(bookId: string, ownerId: string) {
  const book = await getBook(bookId, ownerId);
  if (!book) throw new Error("複製する作品が見つかりません。");
  const project: BookProject = {
    ...book.bookProject,
    config: {
      ...book.bookProject.config,
      title: `${book.bookProject.config.title} のコピー`,
      bookId: `${book.bookProject.config.bookId}-copy-${browserId()}`,
    },
    createdAt: now(),
    updatedAt: now(),
  };
  return saveBook(project, ownerId);
}

export async function softDeleteBook(bookId: string, ownerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    writeLocalBooks(
      readLocalBooks().map((book) =>
        book.id === bookId && book.ownerId === ownerId
          ? { ...book, status: "archived", deletedAt: now(), updatedAt: now() }
          : book,
      ),
    );
    return;
  }
  try {
    const { error } = await supabase
      .from("books")
      .update({ status: "archived", deleted_at: now(), updated_at: now() })
      .eq("id", bookId)
      .eq("owner_id", ownerId);
    if (error) throw error;
  } catch (error) {
    if (!canFallbackToLocal()) throw error;
    writeLocalBooks(
      readLocalBooks().map((book) =>
        book.id === bookId && book.ownerId === ownerId
          ? { ...book, status: "archived", deletedAt: now(), updatedAt: now() }
          : book,
      ),
    );
  }
}
