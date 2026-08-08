"use client";

import { isDemoModeAllowed } from "@/lib/appEnv";
import { BETA_LIMITS, STORAGE_BUCKETS } from "@/lib/limits";
import { getSupabaseClient } from "@/lib/supabase/client";

const PROFILE_STORAGE_PREFIX = "storage:";

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("プロフィール画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfileAvatar(file: File, ownerId: string) {
  if (!BETA_LIMITS.allowedImageTypes.includes(file.type as never)) {
    throw new Error("プロフィール画像はJPEG / PNG / WebPのみ利用できます。");
  }
  if (file.size > BETA_LIMITS.maxImageBytes) {
    throw new Error("プロフィール画像は10MBまでです。");
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (isDemoModeAllowed()) return fileToDataUrl(file);
    throw new Error("Supabase Storageが未設定です。プロフィール画像をアップロードできません。");
  }

  const path = `profiles/${ownerId}/${crypto.randomUUID()}.${extensionForMime(file.type)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKETS.profileAssets).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return `${PROFILE_STORAGE_PREFIX}${STORAGE_BUCKETS.profileAssets}/${path}`;
}
