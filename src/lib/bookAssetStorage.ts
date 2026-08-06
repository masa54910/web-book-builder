"use client";

import type { BookContentBlock, BookProject } from "@/lib/bookProject";
import { getAppEnv, isDemoModeAllowed } from "@/lib/appEnv";
import { BETA_LIMITS, STORAGE_BUCKETS } from "@/lib/limits";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logSupabaseIssue } from "@/lib/supabaseDebug";

const STORAGE_PREFIX = "storage:";
const BOOK_ASSET_BUCKET_CANDIDATES = [STORAGE_BUCKETS.bookAssets, "book_assets"] as const;

function canUseLocalAssetFallback() {
  return process.env.NODE_ENV === "development" && getAppEnv() === "local";
}

function assertStorageConfigured() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    if (isDemoModeAllowed()) return null;
    throw new Error("Supabase Storageが未設定です。Preview/Productionでは画像をローカル保存できません。");
  }
  return supabase;
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function safeFilePart(value: string) {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset"
  );
}

async function dataUrlToBlob(value: string) {
  const response = await fetch(value);
  const blob = await response.blob();
  if (!BETA_LIMITS.allowedImageTypes.includes(blob.type as never)) {
    throw new Error("画像はJPEG / PNG / WebPのみアップロードできます。SVGは利用できません。");
  }
  if (blob.size > BETA_LIMITS.maxImageBytes) {
    throw new Error("画像は1枚10MBまでです。");
  }
  return blob;
}

function storageRef(path: string) {
  return `${STORAGE_PREFIX}${STORAGE_BUCKETS.bookAssets}/${path}`;
}

function storageRefForBucket(bucket: string, path: string) {
  return `${STORAGE_PREFIX}${bucket}/${path}`;
}

export function isStorageReference(value: string | undefined | null) {
  return typeof value === "string" && value.startsWith(STORAGE_PREFIX);
}

export function isDisplayableImageUrl(value: string | undefined | null) {
  return typeof value === "string" && /^(?:https?:\/\/|data:image\/|blob:|\/)/i.test(value);
}

function parseStorageRef(value: string) {
  if (value.startsWith(STORAGE_PREFIX)) {
    const withoutPrefix = value.slice(STORAGE_PREFIX.length);
    const [bucket, ...pathParts] = withoutPrefix.split("/");
    const path = pathParts.join("/");
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  // Some older rows stored the bucket-relative path without the custom
  // `storage:` marker. Treat those as book-assets paths, but never interpret
  // an already displayable URL as a Storage path.
  if (!isDisplayableImageUrl(value) && value.includes("/")) {
    return { bucket: STORAGE_BUCKETS.bookAssets, path: value };
  }
  return null;
}

async function uploadDataUrl({
  value,
  ownerId,
  bookKey,
  kind,
  fileName,
}: {
  value: string;
  ownerId: string;
  bookKey: string;
  kind: "cover" | "images";
  fileName: string;
}) {
  if (!value.startsWith("data:image/")) return value;
  const supabase = assertStorageConfigured();
  if (!supabase) return value;

  const blob = await dataUrlToBlob(value);
  const extension = extensionForMime(blob.type);
  const path = `books/${ownerId}/${bookKey}/${kind}/${crypto.randomUUID()}-${safeFilePart(fileName)}.${extension}`;

  let lastError: Error | null = null;
  for (const bucketName of BOOK_ASSET_BUCKET_CANDIDATES) {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, blob, {
        contentType: blob.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (!error) {
      return storageRefForBucket(bucketName, path);
    }
    lastError = error;
    logSupabaseIssue({
      processingName: "uploadBookProjectAssets",
      target: `storage.${bucketName}`,
      error,
    });
    const lowerMessage = `${error.message || ""} ${error.name || ""}`.toLowerCase();
    if (!lowerMessage.includes("bucket") || !lowerMessage.includes("not")) {
      throw error;
    }
  }

  if (canUseLocalAssetFallback()) {
    return value;
  }

  if (lastError) throw lastError;
  return storageRef(path);
}

export async function uploadBookProjectAssets(project: BookProject, ownerId: string): Promise<BookProject> {
  // Storage object keys must remain ASCII-safe. Preview IDs can be derived from
  // a title and author, so they may contain Japanese or other Unicode letters;
  // keep the public/internal book ID unchanged and sanitize only this path
  // segment. The UUID in each filename still guarantees asset uniqueness.
  const bookKey = safeFilePart(project.config.bookId);
  const coverImage = project.config.coverImage
    ? await uploadDataUrl({
        value: project.config.coverImage,
        ownerId,
        bookKey,
        kind: "cover",
        fileName: "cover",
      })
    : project.config.coverImage;

  const images = [];
  for (const image of project.images) {
    images.push({
      ...image,
      image_url: await uploadDataUrl({
        value: image.image_url,
        ownerId,
        bookKey,
        kind: "images",
        fileName: image.alt || image.image_id || image.image_index,
      }),
    });
  }

  const uploadedById = new Map(
    images.map((image) => [image.image_id || image.image_index, image.image_url]),
  );
  const contentBlocks = project.contentBlocks?.map((block) => {
    if (block.type !== "image") return block;
    const uploadedPath = uploadedById.get(block.id);
    if (!uploadedPath) return block;
    return {
      ...block,
      storagePath: uploadedPath,
      publicUrl: undefined,
      uploadState: "ready" as const,
    };
  });

  return {
    ...project,
    config: {
      ...project.config,
      coverImage,
    },
    images,
    contentBlocks,
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveStorageUrl(value: string) {
  if (!value) return "";
  if (isDisplayableImageUrl(value)) return value;
  const ref = parseStorageRef(value);
  if (!ref) return "";
  const supabase = getSupabaseClient();
  if (!supabase) return "";
  try {
    const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;

    // Public buckets do not need a signed URL. Keep this fallback so the same
    // materializer works for either private signed assets or public assets.
    const publicUrl = supabase.storage.from(ref.bucket).getPublicUrl(ref.path).data.publicUrl;
    if (publicUrl) return publicUrl;
  } catch {
    // A transient Storage URL failure must not erase the asset or prevent the
    // rest of the Preview from opening.
    return "";
  }
  return "";
}

export async function materializeBookProjectAssets(project: BookProject): Promise<BookProject> {
  const coverImage = project.config.coverImage || "";
  const coverImageUrl = coverImage ? await resolveStorageUrl(coverImage) : "";
  const images = await Promise.all(
    project.images.map(async (image) => {
      const storagePath = image.storage_path || image.image_url;
      const publicUrl = await resolveStorageUrl(storagePath || image.public_url || "");
      return {
        ...image,
        image_url: storagePath,
        storage_path: storagePath || undefined,
        public_url: publicUrl || undefined,
      };
    }),
  );
  const contentBlocks = await Promise.all(
    (project.contentBlocks || []).map(async (block): Promise<BookContentBlock> => {
      if (block.type !== "image") return block;
      const publicUrl = await resolveStorageUrl(block.storagePath || block.publicUrl || "");
      return {
        ...block,
        publicUrl: publicUrl || undefined,
      };
    }),
  );
  return {
    ...project,
    config: {
      ...project.config,
      coverImageUrl: coverImageUrl || (isDisplayableImageUrl(coverImage) ? coverImage : undefined),
    },
    images,
    contentBlocks,
  };
}
