"use client";

import { isDemoModeAllowed } from "@/lib/appEnv";
import { safeExternalUrl } from "@/lib/productTypes";
import { getSupabaseClient } from "@/lib/supabase/client";

export type AuthorLinkRecord = {
  id: string;
  label: string;
  url: string;
  linkType: "x" | "note" | "instagram" | "website" | "other";
};

export type ProfilePreferences = {
  emailNotifications: boolean;
  campaignNotifications: boolean;
};

const LOCAL_LINKS_KEY_PREFIX = "webBookMaker:demo:authorLinks:";
const LOCAL_PREFS_KEY_PREFIX = "webBookMaker:demo:profilePrefs:";

function assertLocalFallbackAllowed() {
  if (!isDemoModeAllowed()) {
    throw new Error("Supabase接続が必要です。Preview/Productionではローカル設定を使用できません。");
  }
}

function defaultPrefs(): ProfilePreferences {
  return {
    emailNotifications: true,
    campaignNotifications: false,
  };
}

function mapLink(row: Record<string, unknown>): AuthorLinkRecord {
  const typeValue = String(row.link_type ?? "other");
  const linkType: AuthorLinkRecord["linkType"] =
    typeValue === "x" || typeValue === "note" || typeValue === "instagram" || typeValue === "website" ? typeValue : "other";
  return {
    id: String(row.id),
    label: String(row.label ?? ""),
    url: String(row.url ?? ""),
    linkType,
  };
}

function readLocalLinks(userId: string) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${LOCAL_LINKS_KEY_PREFIX}${userId}`) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AuthorLinkRecord => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as AuthorLinkRecord).id === "string" &&
        typeof (item as AuthorLinkRecord).label === "string" &&
        typeof (item as AuthorLinkRecord).url === "string"
      );
    });
  } catch {
    return [];
  }
}

function readLocalPrefs(userId: string) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${LOCAL_PREFS_KEY_PREFIX}${userId}`) ?? "null");
    if (typeof parsed === "object" && parsed !== null) {
      const value = parsed as Partial<ProfilePreferences>;
      return {
        emailNotifications: Boolean(value.emailNotifications),
        campaignNotifications: Boolean(value.campaignNotifications),
      } satisfies ProfilePreferences;
    }
  } catch {
    // Ignore broken local preference data.
  }
  return defaultPrefs();
}

export async function getOwnAuthorLinks(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return readLocalLinks(userId);
  }
  const { data, error } = await supabase
    .from("author_links")
    .select("id,label,url,link_type")
    .eq("owner_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapLink(row));
}

export async function saveOwnAuthorLinks(userId: string, links: AuthorLinkRecord[]) {
  const cleaned = links
    .map((link) => ({
      ...link,
      label: link.label.trim(),
      url: safeExternalUrl(link.url),
    }))
    .filter((link) => link.label && link.url);

  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    localStorage.setItem(`${LOCAL_LINKS_KEY_PREFIX}${userId}`, JSON.stringify(cleaned));
    return cleaned;
  }

  const { error: deleteError } = await supabase.from("author_links").delete().eq("owner_id", userId);
  if (deleteError) throw deleteError;

  if (cleaned.length) {
    const { error: insertError } = await supabase.from("author_links").insert(
      cleaned.map((link, index) => ({
        owner_id: userId,
        label: link.label,
        url: link.url,
        link_type: link.linkType,
        sort_order: index + 1,
      })),
    );
    if (insertError) throw insertError;
  }

  return cleaned;
}

export async function getOwnProfilePreferences(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    return readLocalPrefs(userId);
  }

  const { data, error } = await supabase
    .from("profile_preferences")
    .select("email_notifications,campaign_notifications")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("profile_preferences") && message.includes("does not exist")) {
      return defaultPrefs();
    }
    throw error;
  }

  if (!data) return defaultPrefs();
  return {
    emailNotifications: Boolean(data.email_notifications),
    campaignNotifications: Boolean(data.campaign_notifications),
  };
}

export async function saveOwnProfilePreferences(userId: string, preferences: ProfilePreferences) {
  const normalized = {
    emailNotifications: Boolean(preferences.emailNotifications),
    campaignNotifications: Boolean(preferences.campaignNotifications),
  } satisfies ProfilePreferences;

  const supabase = getSupabaseClient();
  if (!supabase) {
    assertLocalFallbackAllowed();
    localStorage.setItem(`${LOCAL_PREFS_KEY_PREFIX}${userId}`, JSON.stringify(normalized));
    return normalized;
  }

  const { error } = await supabase.from("profile_preferences").upsert(
    {
      user_id: userId,
      email_notifications: normalized.emailNotifications,
      campaign_notifications: normalized.campaignNotifications,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("profile_preferences") && message.includes("does not exist")) {
      return normalized;
    }
    throw error;
  }

  return normalized;
}
