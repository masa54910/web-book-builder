"use client";

import type { BookProject } from "@/lib/bookProject";
import { getAppEnv, isDemoModeAllowed } from "@/lib/appEnv";
import { BETA_LIMITS, STORAGE_BUCKETS } from "@/lib/limits";
import { getSupabaseClient } from "@/lib/supabase/client";

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

function parseStorageRef(value: string) {
  if (!value.startsWith(STORAGE_PREFIX)) return null;
  const withoutPrefix = value.slice(STORAGE_PREFIX.length);
  const [bucket, ...pathParts] = withoutPrefix.split("/");
  const path = pathParts.join("/");
  if (!bucket || !path) return null;
  return { bucket, path };
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
  const bookKey = project.config.bookId;
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

  return {
    ...project,
    config: {
      ...project.config,
      coverImage,
    },
    images,
    updatedAt: new Date().toISOString(),
  };
}

export async function resolveStorageUrl(value: string) {
  const ref = parseStorageRef(value);
  if (!ref) return value;
  const supabase = getSupabaseClient();
  if (!supabase) return "";
  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 60 * 60);
  if (error) return "";
  return data.signedUrl;
}

export async function materializeBookProjectAssets(project: BookProject): Promise<BookProject> {
  const coverImage = project.config.coverImage
    ? await resolveStorageUrl(project.config.coverImage)
    : project.config.coverImage;
  const images = await Promise.all(
    project.images.map(async (image) => ({
      ...image,
      image_url: await resolveStorageUrl(image.image_url),
    })),
  );
  return {
    ...project,
    config: { ...project.config, coverImage },
    images,
  };
}
