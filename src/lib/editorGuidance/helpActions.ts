import type { EditorHelpCatalogEntry } from "@/lib/editorGuidance/helpTypes";

export type EditorHelpEntryKind = "ACTION" | "ROUTE" | "ANSWER_ONLY" | "UNSUPPORTED";

export function classifyEditorHelpEntry(entry: EditorHelpCatalogEntry): EditorHelpEntryKind {
  if (entry.unsupported) return "UNSUPPORTED";
  if (entry.actionId) return "ACTION";
  if (entry.route) return "ROUTE";
  return "ANSWER_ONLY";
}

/** Uses only trusted Catalog metadata and the current Editor book id. */
export function resolveEditorHelpRoute(
  entry: EditorHelpCatalogEntry,
  currentBookId?: string,
): `/${string}` | undefined {
  if (entry.intent === "analytics" && currentBookId) {
    return `/analytics/${encodeURIComponent(currentBookId)}`;
  }
  return entry.route;
}
