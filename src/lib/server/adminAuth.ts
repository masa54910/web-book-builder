import "server-only";

import type { User } from "@supabase/supabase-js";

import { requireAuthenticatedUser } from "@/lib/server/requestAuth";
import { requireSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export type AdminAuthResult =
  | { user: User; status: null }
  | { user: null; status: 401 | 403 };

/**
 * Admin routes authenticate the bearer token and then resolve the role from
 * the server-only profiles table. The browser never receives service-role
 * credentials or the role lookup result.
 */
export async function authenticateAdminRequest(request: Request): Promise<AdminAuthResult> {
  const user = await requireAuthenticatedUser(request);
  if (!user) return { user: null, status: 401 };

  if (user.app_metadata?.role === "admin") return { user, status: null };

  const { data, error } = await requireSupabaseAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  if (!error && data?.role === "admin") return { user, status: null };

  // Production currently has no role column or admin claim. Reuse the
  // existing server-only notification recipient as an allowlist fallback;
  // the value is never returned to the browser or written to logs.
  const configuredAdminEmails = (process.env.SUPPORT_ADMIN_EMAILS || process.env.CONTACT_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const authenticatedEmail = user.email?.trim().toLowerCase() || "";
  if (authenticatedEmail && configuredAdminEmails.includes(authenticatedEmail)) return { user, status: null };

  return { user: null, status: 403 };
}
