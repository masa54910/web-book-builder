"use client";

import type { BookProject } from "@/lib/bookProject";
import { DEFAULT_PUBLICATION_SETTINGS, type BookStatus, type BookVisibility } from "@/lib/accessControl";
import { BETA_LIMITS } from "@/lib/limits";
import { isDemoModeAllowed } from "@/lib/appEnv";
import { createNewBookSlugCandidate, createSlugCandidate, makeUniqueSlug } from "@/lib/slug";
import { getSupabaseClient } from "@/lib/supabase/client";
import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { stripRuntimeAssetUrls } from "@/lib/bookProject";
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

type BookImageProjectionRow = {
  image_key: string | null;
  storage_path: string | null;
  caption: string | null;
  chapter_id: string | null;
  sort_order: number | null;
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

function isSlugUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  if (candidate.code !== "23505") return false;
  const text = `${String(candidate.message || "")} ${String(candidate.details || "")}`.toLowerCase();
  return text.includes("books_slug_key") || text.includes("slug");
}

async function loadUsedSlugs(supabase: ReturnType<typeof getSupabaseClient>, base: string) {
  const used = new Set<string>();
  if (!supabase) {
    if (!canUseLocalSchemaFallback()) return used;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_BOOKS_KEY) ?? "[]");
      if (Array.isArray(parsed)) {
        parsed.forEach((book) => {
          if (book && typeof book === "object" && typeof (book as { slug?: unknown }).slug === "string") {
            used.add((book as { slug: string }).slug);
          }
        });
      }
    } catch {
      // Keep the empty set; the local repository is only a development fallback.
    }
    return used;
  }

  // RLS may limit this best-effort lookup to the current owner. The unique
  // constraint plus the retry loop in saveBook remains the final authority.
  try {
    const { data } = await supabase
      .from("books")
      .select("slug")
      .like("slug", `${base}%`)
      .limit(500);
    for (const row of data || []) {
      if (typeof row.slug === "string" && row.slug) used.add(row.slug);
    }
  } catch {
    // Continue with an empty set; the INSERT retry below handles races and
    // rows hidden by RLS without weakening the database constraint.
  }
  return used;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isPersistedBookId(value: string | undefined | null): value is string {
  return typeof value === "string" && looksLikeUuid(value);
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
  reservedSlugs?: Set<string>,
): CloudBookRecord {
  const persistedProject = stripRuntimeAssetUrls(project);
  const timestamp = now();
  const usedSlugs = reservedSlugs || new Set(
    isDemoModeAllowed()
      ? readLocalBooks()
          .filter((book) => book.id !== existing?.id)
          .map((book) => book.slug)
      : [],
  );
  const requestedSlug = existing
    ? existing.slug
    : desiredSlug || createNewBookSlugCandidate(project.config.title);
  const slug = existing ? existing.slug : makeUniqueSlug(requestedSlug, usedSlugs);

  return {
    id: existing?.id || `book-${browserId()}`,
    ownerId,
    title: persistedProject.config.title,
    subtitle: persistedProject.config.subtitle,
    authorName: persistedProject.config.author,
    authorHandle: persistedProject.config.authorProfile?.handle || createSlugCandidate(persistedProject.config.author),
    description: persistedProject.config.description,
    publisher: persistedProject.config.publisherName,
    publishedAt: persistedProject.config.publishedAt,
    copyright: persistedProject.config.copyrightText,
    slug,
    status: existing?.status || "draft",
    visibility: existing?.visibility || "private",
    bindingDirection: persistedProject.config.bindingDirection,
    theme: persistedProject.config.theme,
    charactersPerPage: persistedProject.config.charactersPerPage,
    tocItemsPerPage: persistedProject.config.tableOfContentsItemsPerPage,
    coverPath: persistedProject.config.coverImage || "",
    rawText: persistedProject.rawText,
    bookProject: persistedProject,
    version: persistedProject.version,
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

/**
 * Enrich a BookProject with the queryable image projection when available.
 *
 * BookProject remains the source of truth. Projection rows only fill missing
 * asset references (or restore an image row that is absent from an older
 * project JSON) so Storage URL materialization can resolve every asset on
 * editor/public-reader entry.
 */
function mergeBookImageProjection(record: CloudBookRecord, rows: BookImageProjectionRow[]) {
  if (!rows.length) return record;

  const projectImages = Array.isArray(record.bookProject.images) ? record.bookProject.images : [];
  const imageByKey = new Map(
    projectImages.map((image, index) => [image.image_id || image.image_index || `image-${index + 1}`, image]),
  );
  const usedKeys = new Set<string>();
  const normalizedRows = rows
    .map((row, index) => {
      const key = row.image_key?.trim() || `image-${index + 1}`;
      const storagePath = row.storage_path?.trim() || "";
      return { ...row, key, storagePath };
    })
    .filter((row) => row.storagePath);
  const rowByKey = new Map(normalizedRows.map((row) => [row.key, row]));

  const mergedImages = projectImages.map((image, index) => {
    const key = image.image_id || image.image_index || `image-${index + 1}`;
    const row = rowByKey.get(key) || normalizedRows.find((candidate) => candidate.storagePath === image.storage_path || candidate.storagePath === image.image_url);
    if (!row) return image;
    usedKeys.add(row.key);
    return {
      ...image,
      image_id: image.image_id || row.key,
      image_index: image.image_index || row.key,
      image_url: row.storagePath,
      storage_path: row.storagePath,
      caption: image.caption || row.caption || "",
      chapter_order: image.chapter_order || Number(row.chapter_id || 0) || 0,
      chapter_title: image.chapter_title || row.chapter_id || "",
    };
  });

  for (const row of normalizedRows) {
    if (usedKeys.has(row.key) || imageByKey.has(row.key)) continue;
    mergedImages.push({
      chapter_order: Number(row.chapter_id || 0) || 0,
      chapter_title: row.chapter_id || "",
      image_index: row.key,
      image_id: row.key,
      image_url: row.storagePath,
      storage_path: row.storagePath,
      alt: row.key,
      caption: row.caption || "",
      source_path: row.key,
      local_path: "",
    });
  }

  const mergedBlocks = record.bookProject.contentBlocks?.map((block) => {
    if (block.type !== "image") return block;
    const row = rowByKey.get(block.id) || normalizedRows.find((candidate) => candidate.storagePath === block.storagePath);
    if (!row) return block;
    usedKeys.add(row.key);
    return {
      ...block,
      storagePath: block.storagePath || row.storagePath,
      caption: block.caption || row.caption || undefined,
    };
  });

  return {
    ...record,
    bookProject: {
      ...record.bookProject,
      images: mergedImages,
      contentBlocks: mergedBlocks,
    },
  };
}

async function hydrateBookImageProjection(record: CloudBookRecord, ownerId?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return record;

  try {
    let query = supabase
      .from("book_images")
      .select("image_key,storage_path,caption,chapter_id,sort_order")
      .eq("book_id", record.id)
      .order("sort_order", { ascending: true });
    if (ownerId) query = query.eq("owner_id", ownerId);
    const { data, error } = await query;
    if (error) {
      logSupabaseIssue({ processingName: "loadBookImageProjection", target: "book_images.select", error });
      return record;
    }
    return mergeBookImageProjection(record, (data ?? []) as BookImageProjectionRow[]);
  } catch (error) {
    // Projection recovery must never hide a valid canonical BookProject.
    logSupabaseIssue({ processingName: "loadBookImageProjection", target: "book_images.select", error });
    return record;
  }
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

const BOOK_LIMIT_ERROR = `安全上の制限により、1ユーザーあたり最大${BETA_LIMITS.maxBooksPerUser}作品まで作成できます。`;

/**
 * Check the active-book limit before any book, side-table, or asset write.
 * Archived and soft-deleted records are intentionally excluded from the count.
 */
export async function assertBookCreationAvailable(ownerId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    const activeBooks = readLocalBooks().filter(
      (book) => book.ownerId === ownerId && !book.deletedAt && book.status !== "archived",
    );
    if (activeBooks.length >= BETA_LIMITS.maxBooksPerUser) {
      throw new Error(BOOK_LIMIT_ERROR);
    }
    return;
  }

  try {
    const { count, error } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .neq("status", "archived");
    if (error) {
      logSupabaseIssue({ processingName: "saveBook", target: "books.count", error });
      throw error;
    }
    if ((count ?? 0) >= BETA_LIMITS.maxBooksPerUser) {
      throw new Error(BOOK_LIMIT_ERROR);
    }
  } catch (error) {
    // A capacity check must never silently switch to localStorage in review or
    // production. Demo mode may still use the local repository intentionally.
    if (!canFallbackToLocal()) throw error;
    const activeBooks = readLocalBooks().filter(
      (book) => book.ownerId === ownerId && !book.deletedAt && book.status !== "archived",
    );
    if (activeBooks.length >= BETA_LIMITS.maxBooksPerUser) {
      throw new Error(BOOK_LIMIT_ERROR);
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
    const record = data ? mapSupabaseBook(data) : null;
    return record ? await hydrateBookImageProjection(record, ownerId) : null;
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
    const record = data ? mapSupabaseBook(data) : null;
    return record ? await hydrateBookImageProjection(record) : null;
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
  options: { skipSideTables?: boolean } = {},
) {
  const existing = existingId ? await getBook(existingId, ownerId) : null;
  if (!existing) {
    // This is deliberately outside the write try/catch. If the limit is
    // reached, no books, side tables, or Storage assets may be written.
    await assertBookCreationAvailable(ownerId);
  }
  if (project.rawText.length > BETA_LIMITS.maxCharactersPerBook) {
    throw new Error(`本文は最大${BETA_LIMITS.maxCharactersPerBook.toLocaleString("ja-JP")}文字までです。`);
  }
  if (project.images.length > BETA_LIMITS.maxImagesPerBook) {
    throw new Error(`画像は最大${BETA_LIMITS.maxImagesPerBook}枚までです。`);
  }

  const supabase = getSupabaseClient();
  const slugBase = existing
    ? existing.slug
    : desiredSlug || createNewBookSlugCandidate(project.config.title);
  const usedSlugs = existing ? new Set<string>() : await loadUsedSlugs(supabase, slugBase);

  if (!supabase) {
    assertLocalFallbackAllowed();
    const record = toRecord(project, ownerId, existing ?? undefined, slugBase, usedSlugs);
    const next = readLocalBooks().filter((book) => book.id !== record.id);
    next.push(record);
    writeLocalBooks(next);
    return record;
  }

  const maxSlugRetries = existing ? 0 : 8;
  for (let attempt = 0; attempt <= maxSlugRetries; attempt += 1) {
    const record = toRecord(
      project,
      ownerId,
      existing ?? undefined,
      existing ? existing.slug : makeUniqueSlug(slugBase, usedSlugs),
      usedSlugs,
    );
    try {
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
        if (!isSlugUniqueViolation(error) || attempt >= maxSlugRetries) {
          logSupabaseIssue({ processingName: "saveBook", target: "books.upsert", error });
          throw error;
        }
        usedSlugs.add(record.slug);
        continue;
      }
      const saved = mapSupabaseBook(data) ?? record;
      if (!options.skipSideTables) {
        await syncBookSideTables(saved);
      }
      return saved;
    } catch (error) {
      if (!isSlugUniqueViolation(error) || attempt >= maxSlugRetries) {
        logSupabaseIssue({ processingName: "saveBook", target: "books.catch", error });
        if (!canFallbackToLocal()) throw error;
        const next = readLocalBooks().filter((book) => book.id !== record.id);
        next.push(record);
        writeLocalBooks(next);
        return record;
      }
      usedSlugs.add(record.slug);
    }
  }

  throw new Error("Unable to allocate a unique public slug");
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
