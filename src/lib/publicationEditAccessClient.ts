"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { PublicationEditDecision } from "@/lib/publicationEditWindow";

export async function getPublicationEditAccess(bookId: string): Promise<PublicationEditDecision> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { allowed: true, reason: "free", expiresAt: null };
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    return { allowed: false, reason: "missing-first-published-at", expiresAt: null };
  }
  try {
    const response = await fetch("/api/books/edit-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("edit access request failed");
    return {
      allowed: result.allowed === true,
      reason: typeof result.reason === "string" ? result.reason : "missing-first-published-at",
      expiresAt: typeof result.expiresAt === "string" ? result.expiresAt : null,
    } as PublicationEditDecision;
  } catch {
    return { allowed: false, reason: "missing-first-published-at", expiresAt: null };
  }
}
