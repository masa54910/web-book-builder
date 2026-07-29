"use client";

import { isDemoModeAllowed } from "@/lib/appEnv";
import { normalizeHandle, safeExternalUrl } from "@/lib/productTypes";
import { getSupabaseClient } from "@/lib/supabase/client";

export type ProfileRecord = {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarPath: string;
  websiteUrl: string;
  isPublic: boolean;
  updatedAt: string;
};

const LOCAL_PROFILE_KEY_PREFIX = "webBookMaker:demo:profile:";

function fallbackProfile(userId: string, email = ""): ProfileRecord {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    displayName: email || "WebBookMakerユーザー",
    handle: normalizeHandle(email.split("@")[0] || userId, "author"),
    bio: "",
    avatarPath: "",
    websiteUrl: "",
    isPublic: true,
    updatedAt: now,
  };
}

function assertLocalFallbackAllowed() {
  if (!isDemoModeAllowed()) {
    throw new Error("Supabase接続が必要です。Preview/Productionではローカルプロフィールを使用できません。");
  }
}

function mapProfile(row: Record<string, unknown>): ProfileRecord {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    displayName: String(row.display_name ?? ""),
    handle: String(row.handle ?? ""),
    bio: String(row.bio ?? ""),
    avatarPath: String(row.avatar_path ?? ""),
    websiteUrl: String(row.website_url ?? ""),
    isPublic: Boolean(row.is_public ?? true),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getOwnProfile(userId: string, email = "") {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${LOCAL_PROFILE_KEY_PREFIX}${userId}`) ?? "null");
      if (parsed && typeof parsed === "object" && typeof (parsed as ProfileRecord).id === "string") {
        return parsed as ProfileRecord;
      }
    } catch {
      // Ignore broken local demo profile.
    }
    return fallbackProfile(userId, email);
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return mapProfile(data);

  const initial = fallbackProfile(userId, email);
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      display_name: initial.displayName,
      handle: initial.handle,
      bio: "",
      website_url: "",
      is_public: true,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return mapProfile(inserted);
}

export async function saveOwnProfile(profile: ProfileRecord) {
  const supabase = getSupabaseClient();
  const payload = {
    id: profile.id,
    email: profile.email,
    display_name: profile.displayName.trim(),
    handle: normalizeHandle(profile.handle, "author"),
    bio: profile.bio.trim(),
    avatar_path: profile.avatarPath,
    website_url: safeExternalUrl(profile.websiteUrl),
    is_public: profile.isPublic,
    updated_at: new Date().toISOString(),
  };

  if (!supabase) {
    assertLocalFallbackAllowed();
    const next = mapProfile(payload);
    localStorage.setItem(`${LOCAL_PROFILE_KEY_PREFIX}${profile.id}`, JSON.stringify(next));
    return next;
  }

  const { data, error } = await supabase.from("profiles").upsert(payload).select("*").single();
  if (error) throw error;
  return mapProfile(data);
}
