import type { EditorHelpActionId } from "@/lib/editorGuidance/actionIds";

export type EditorHelpLocale = "ja-JP";
export type EditorHelpSource = "editor" | "help" | "pricing" | "analytics";

export type EditorHelpCatalogEntry = {
  intent: string;
  locale: EditorHelpLocale;
  title: string;
  answer: string;
  phrases: readonly string[];
  keywords: readonly string[];
  uniqueKeywords?: readonly string[];
  priority: number;
  actionId?: EditorHelpActionId;
  route?: `/${string}`;
  relatedIntents?: readonly string[];
  source: EditorHelpSource;
  unsupported?: boolean;
};

export type EditorHelpConfidence = "high" | "medium" | "low";

export type EditorHelpMatchResult =
  | {
      kind: "answer";
      confidence: Exclude<EditorHelpConfidence, "low">;
      entry: EditorHelpCatalogEntry;
    }
  | {
      kind: "ambiguous";
      confidence: "low" | "medium";
      entries: readonly EditorHelpCatalogEntry[];
    }
  | {
      kind: "fallback";
      confidence: "low";
      entries: readonly EditorHelpCatalogEntry[];
    };
