import "server-only";

import { getServerSupabaseClient } from "@/lib/supabase/server";
import { safeExternalUrl } from "@/lib/productTypes";
import {
  normalizeAuthorPageHandle,
  type PublicAuthorLink,
  type PublicAuthorLinkType,
  type PublicAuthorBook,
  type PublicAuthorPageData,
} from "@/lib/authorPage";

type PublicProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_path: string | null;
  website_url: string | null;
};

type PublicBookRow = {
  id: string;
  title: string | null;
  description: string | null;
  slug: string | null;
  cover_path: string | null;
  updated_at: string | null;
};

type LegacyBookProjectRow = {
  id: string;
  book_project_json: unknown;
};

const STORAGE_PREFIX = "storage:";
const DEFAULT_BOOK_BUCKET = "book-assets";
const DEFAULT_PROFILE_BUCKET = "profile-assets";

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function storageParts(value: string, defaultBucket: string) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return null;
  if (value.startsWith(STORAGE_PREFIX)) {
    const [bucket, ...parts] = value.slice(STORAGE_PREFIX.length).split("/");
    const path = parts.join("/");
    return bucket && path ? { bucket, path } : null;
  }
  return value.includes("/") ? { bucket: defaultBucket, path: value } : null;
}

async function resolvePublicAssetUrl(value: string, defaultBucket: string, cache: Map<string, string>) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (cache.has(value)) return cache.get(value) || "";

  const supabase = getServerSupabaseClient();
  const parts = storageParts(value, defaultBucket);
  if (!supabase || !parts) return "";

  let resolved = "";
  try {
    const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
    if (data?.signedUrl) {
      resolved = data.signedUrl;
    } else {
      resolved = supabase.storage.from(parts.bucket).getPublicUrl(parts.path).data.publicUrl || "";
    }
  } catch {
    resolved = "";
  }
  cache.set(value, resolved);
  return resolved;
}

function coverPathFromProject(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const config = (value as { config?: unknown }).config;
  if (!config || typeof config !== "object") return "";
  const cover = (config as { coverImage?: unknown; coverImageUrl?: unknown }).coverImage;
  const coverUrl = (config as { coverImageUrl?: unknown }).coverImageUrl;
  return asText(cover) || asText(coverUrl);
}

function normalizeLinkType(value: unknown): PublicAuthorLinkType {
  const type = String(value || "other");
  if (type === "x" || type === "note" || type === "instagram" || type === "website") return type;
  return "other";
}

export async function loadPublicAuthorPage(handleInput: string): Promise<PublicAuthorPageData | null> {
  const handle = normalizeAuthorPageHandle(handleInput);
  if (!handle) return null;

  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,handle,bio,avatar_path,website_url")
    .eq("handle", handle)
    .eq("is_public", true)
    .maybeSingle<PublicProfileRow>();
  if (profileError || !profileRow) return null;

  const [{ data: linkRows, error: linksError }, { data: bookRows, error: booksError }] = await Promise.all([
    supabase
      .from("author_links")
      .select("label,url,link_type,sort_order")
      .eq("owner_id", profileRow.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("books")
      .select("id,title,description,slug,cover_path,updated_at")
      .eq("owner_id", profileRow.id)
      .eq("author_handle", handle)
      .eq("status", "published")
      .in("visibility", ["public", "unlisted"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);
  if (linksError || booksError) return null;

  const profileAvatar = await resolvePublicAssetUrl(asText(profileRow.avatar_path), DEFAULT_PROFILE_BUCKET, new Map());
  const publicBookRows = (bookRows || []) as PublicBookRow[];
  const legacyCoverIds = publicBookRows.filter((row) => !asText(row.cover_path)).map((row) => row.id);
  const legacyProjects = new Map<string, unknown>();
  if (legacyCoverIds.length) {
    const { data: legacyRows } = await supabase
      .from("books")
      .select("id,book_project_json")
      .in("id", legacyCoverIds);
    for (const row of (legacyRows || []) as LegacyBookProjectRow[]) {
      legacyProjects.set(row.id, row.book_project_json);
    }
  }

  const coverCache = new Map<string, string>();
  const books: PublicAuthorBook[] = await Promise.all(
    publicBookRows.map(async (row) => {
      const storedCover = asText(row.cover_path) || coverPathFromProject(legacyProjects.get(row.id));
      return {
        title: asText(row.title),
        description: asText(row.description),
        slug: asText(row.slug),
        coverUrl: await resolvePublicAssetUrl(storedCover, DEFAULT_BOOK_BUCKET, coverCache),
        updatedAt: asText(row.updated_at),
      };
    }),
  );

  const links: PublicAuthorLink[] = ((linkRows || []) as Array<Record<string, unknown>>)
    .map((row) => ({
      label: asText(row.label),
      url: safeExternalUrl(asText(row.url)),
      linkType: normalizeLinkType(row.link_type),
    }))
    .filter((link) => link.label && link.url);

  return {
    profile: {
      displayName: asText(profileRow.display_name) || `@${handle}`,
      handle: asText(profileRow.handle) || handle,
      bio: asText(profileRow.bio),
      avatarUrl: profileAvatar,
      websiteUrl: safeExternalUrl(asText(profileRow.website_url)),
    },
    links,
    books,
  };
}
