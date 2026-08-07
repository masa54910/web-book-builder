import { promises as fs } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { parseBookProjectJson } from "@/lib/bookProjectNormalization";
import { SAMPLE_BOOK_AUTHOR, SAMPLE_BOOK_COVER_IMAGE, SAMPLE_BOOK_DESCRIPTION, SAMPLE_BOOK_SLUG, SAMPLE_BOOK_TITLE } from "@/lib/sampleBookConstants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_BUCKET = "book-assets";
const STORAGE_PREFIX = "storage:";
const CACHE_CONTROL = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

type PublicBookOgRow = {
  title?: unknown;
  description?: unknown;
  author_name?: unknown;
  cover_path?: unknown;
  book_project_json?: unknown;
};

type CoverReference =
  | { kind: "local"; path: string }
  | { kind: "storage"; bucket: string; path: string }
  | { kind: "remote"; url: string };

type CoverAsset = {
  body: ArrayBuffer;
  contentType: string;
};

function copyToArrayBuffer(value: Uint8Array) {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCoverReference(value: unknown): CoverReference | null {
  const raw = asText(value);
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || /localhost|127\.0\.0\.1/i.test(raw)) return null;

  if (/^http:\/\//i.test(raw)) return null;

  if (raw.startsWith("/")) return { kind: "local", path: raw.split("?", 1)[0] };

  if (raw.startsWith(STORAGE_PREFIX)) {
    const [bucket, ...pathParts] = raw.slice(STORAGE_PREFIX.length).split("/");
    const storagePath = pathParts.join("/");
    return bucket && storagePath ? { kind: "storage", bucket, path: storagePath } : null;
  }

  if (/^https:\/\//i.test(raw)) return { kind: "remote", url: raw };
  const bucketPrefix = `${DEFAULT_BUCKET}/`;
  if (raw.startsWith(bucketPrefix)) {
    return { kind: "storage", bucket: DEFAULT_BUCKET, path: raw.slice(bucketPrefix.length) };
  }
  if (raw.includes("/")) return { kind: "storage", bucket: DEFAULT_BUCKET, path: raw };
  return null;
}

function coverReferenceFromRow(row: PublicBookOgRow | null) {
  const project = row?.book_project_json ? parseBookProjectJson(row.book_project_json) : null;
  return (
    parseCoverReference(row?.cover_path) ||
    parseCoverReference(project?.config.coverImage) ||
    null
  );
}

function mimeTypeForPath(value: string) {
  const extension = path.extname(value).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

async function readLocalCover(reference: Extract<CoverReference, { kind: "local" }>) {
  if (!reference.path.startsWith("/sample-images/")) return null;
  const relativePath = reference.path.slice(1).replaceAll("/", path.sep);
  const publicRoot = path.resolve(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, relativePath);
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) return null;
  try {
    const body = await fs.readFile(filePath);
    return {
      body: copyToArrayBuffer(body),
      contentType: mimeTypeForPath(filePath),
    };
  } catch {
    return null;
  }
}

function isAllowedRemoteCover(url: string, request: Request, supabaseUrl: string | undefined) {
  try {
    const parsed = new URL(url);
    const allowedOrigins = new Set([
      new URL(request.url).origin,
      "https://webbookmaker.vercel.app",
      ...(supabaseUrl ? [new URL(supabaseUrl).origin] : []),
    ]);
    return parsed.protocol === "https:" && allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

async function fetchRemoteCover(url: string, request: Request, supabaseUrl?: string) {
  if (!isAllowedRemoteCover(url, request, supabaseUrl)) return null;
  try {
    const response = await fetch(url, { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) return null;
    return { body: await response.arrayBuffer(), contentType };
  } catch {
    return null;
  }
}

async function resolveStorageCover(
  reference: Extract<CoverReference, { kind: "storage" }>,
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const signed = await supabase.storage.from(reference.bucket).createSignedUrl(reference.path, 60 * 60);
  if (!signed.error && signed.data?.signedUrl) {
    const fetched = await fetchRemoteCover(signed.data.signedUrl, request, supabaseUrl);
    if (fetched) return fetched;
  }

  const publicUrl = supabase.storage.from(reference.bucket).getPublicUrl(reference.path).data.publicUrl;
  return fetchRemoteCover(publicUrl, request, supabaseUrl);
}

async function formatOgCover(cover: CoverAsset) {
  try {
    const source = Buffer.from(new Uint8Array(cover.body));
    const metadata = await sharp(source).metadata();
    const width = metadata.width || 1;
    const height = metadata.height || 1;
    const fit = width / height >= 1.35 ? "cover" : "contain";
    const body = await sharp(source)
      .resize(1200, 630, {
        fit,
        position: "attention",
        background: { r: 242, g: 248, b: 252, alpha: 1 },
      })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();
    return {
      body: copyToArrayBuffer(body),
      contentType: "image/jpeg",
    };
  } catch {
    // If an older or unusual image format cannot be transformed, the original
    // cover is still preferable to replacing it with a generic fallback.
    return cover;
  }
}

async function loadPublishedBook(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data } = await supabase
    .from("books")
    .select("title,description,author_name,cover_path,book_project_json")
    .eq("slug", slug)
    .eq("status", "published")
    .in("visibility", ["public", "unlisted"])
    .is("deleted_at", null)
    .maybeSingle<PublicBookOgRow>();
  return data || null;
}

function fallbackSvg({ title, description, author, slug }: { title: string; description: string; author: string; slug: string }) {
  const safeTitle = escapeXml(title.slice(0, 80));
  const safeDescription = escapeXml(description.slice(0, 150));
  const safeAuthor = escapeXml(author.slice(0, 60));
  const safeSlug = escapeXml(slug.slice(0, 80));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="WebBookMaker OGP">
  <defs>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff8ec"/>
      <stop offset="1" stop-color="#efd9b9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#5b3920" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#fbf1e2"/>
  <circle cx="1010" cy="110" r="190" fill="#f1c987" opacity="0.28"/>
  <rect x="142" y="90" width="916" height="450" rx="34" fill="url(#paper)" filter="url(#shadow)"/>
  <path d="M600 105v420" stroke="#d7bd98" stroke-width="4"/>
  <path d="M585 105c-22 78-22 342 0 420" stroke="#bea17b" stroke-width="12" opacity="0.35"/>
  <path d="M615 105c22 78 22 342 0 420" stroke="#bea17b" stroke-width="12" opacity="0.22"/>
  <text x="210" y="190" fill="#9c641f" font-family="Georgia,serif" font-size="28" letter-spacing="6">WebBookMaker</text>
  <text x="210" y="272" fill="#332319" font-family="sans-serif" font-size="56" font-weight="700">${safeTitle}</text>
  <text x="210" y="336" fill="#5c4633" font-family="sans-serif" font-size="28">/${safeSlug}</text>
  <text x="690" y="210" fill="#332319" font-family="sans-serif" font-size="30">${safeDescription}</text>
  <text x="690" y="282" fill="#332319" font-family="sans-serif" font-size="28">${safeAuthor}</text>
  <text x="690" y="368" fill="#7a5432" font-family="sans-serif" font-size="24">Created with WebBookMaker</text>
</svg>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "web-book");
  const sample = decodedSlug === SAMPLE_BOOK_SLUG;
  const row = sample ? null : await loadPublishedBook(decodedSlug);
  const title = asText(row?.title) || (sample ? SAMPLE_BOOK_TITLE : "WebBookMaker");
  const description = asText(row?.description) || (sample ? SAMPLE_BOOK_DESCRIPTION : "WebBookMakerで作品を読む");
  const author = asText(row?.author_name) || (sample ? SAMPLE_BOOK_AUTHOR : "WebBookMaker");
  const coverReference = sample ? parseCoverReference(SAMPLE_BOOK_COVER_IMAGE) : coverReferenceFromRow(row);

  if (coverReference) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const storageKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const cover = coverReference.kind === "local"
      ? await readLocalCover(coverReference)
      : coverReference.kind === "remote"
        ? await fetchRemoteCover(coverReference.url, request, supabaseUrl)
        : supabaseUrl && storageKey
          ? await resolveStorageCover(coverReference, request, supabaseUrl, storageKey)
          : null;

    if (cover) {
      const ogCover = await formatOgCover(cover);
      return new NextResponse(ogCover.body, {
        headers: {
          "Content-Type": ogCover.contentType,
          "Cache-Control": CACHE_CONTROL,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }

  const svg = fallbackSvg({ title, description, author, slug: decodedSlug });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
