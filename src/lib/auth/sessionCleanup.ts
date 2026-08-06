"use client";

import {
  deleteDraft,
  deletePreviewReturnState,
} from "@/lib/browserBookStorage";
import { deleteCanonicalPreview } from "@/lib/canonicalPreviewStorage";

/**
 * Removes browser-only work in progress data when an auth session ends.
 *
 * Persisted books, reader positions, bookmarks, and account-scoped settings
 * are intentionally not touched here. This cleanup only covers temporary
 * editor/preview state that must never leak into another account.
 */
export async function clearTransientSessionData() {
  deleteDraft();
  deletePreviewReturnState();
  await deleteCanonicalPreview();
}
