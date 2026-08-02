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

type ProfileSeed = {
  email?: string;
  displayName?: string;
};

function fallbackProfile(userId: string, seed: ProfileSeed = {}): ProfileRecord {
  const now = new Date().toISOString();
  const email = seed.email?.trim() || "";
  const displayName = seed.displayName?.trim() || email || "";
  const handleSeed = email.split("@")[0] || displayName || userId;
  return {
    id: userId,
    email,
    displayName,
    handle: normalizeHandle(handleSeed, "author"),
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

export async function getOwnProfile(userId: string, seedInput: ProfileSeed = {}) {
  const supabase = getSupabaseClient();
  const seed: ProfileSeed = {
    email: seedInput.email,
    displayName: seedInput.displayName,
  };
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
    return fallbackProfile(userId, seed);
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("profiles.select failed", {
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error("PROFILE_FETCH_FAILED");
  }
  if (data) return mapProfile(data);

  return fallbackProfile(userId, seed);
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

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapProfile(data);
}
