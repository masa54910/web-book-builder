import {
  commonHelpEntries,
  EDITOR_HELP_CATALOG,
} from "@/lib/editorGuidance/helpCatalog";
import { normalizeHelpQuery } from "@/lib/editorGuidance/helpNormalize";
import type {
  EditorHelpCatalogEntry,
  EditorHelpMatchResult,
} from "@/lib/editorGuidance/helpTypes";

type ScoredEntry = {
  entry: EditorHelpCatalogEntry;
  score: number;
  phraseMatches: number;
  keywordMatches: number;
  uniqueMatches: number;
};

type CompiledEntry = {
  entry: EditorHelpCatalogEntry;
  phrases: readonly string[];
  keywords: readonly string[];
  uniqueKeywords: readonly string[];
};

const compiledCatalogs = new WeakMap<readonly EditorHelpCatalogEntry[], readonly CompiledEntry[]>();

function normalizedValues(values: readonly string[]) {
  return values.map(normalizeHelpQuery).filter(Boolean);
}

function compileCatalog(catalog: readonly EditorHelpCatalogEntry[]) {
  const existing = compiledCatalogs.get(catalog);
  if (existing) return existing;
  const compiled = catalog.map((entry) => ({
    entry,
    phrases: normalizedValues(entry.phrases),
    keywords: normalizedValues(entry.keywords),
    uniqueKeywords: normalizedValues(entry.uniqueKeywords ?? []),
  }));
  compiledCatalogs.set(catalog, compiled);
  return compiled;
}

function scoreEntry(query: string, compiled: CompiledEntry): ScoredEntry | null {
  const { entry, phrases, keywords, uniqueKeywords } = compiled;
  const phraseMatches = phrases.filter((phrase) => query.includes(phrase)).length;
  const keywordMatches = keywords.filter((keyword) => query.includes(keyword)).length;
  const uniqueMatches = uniqueKeywords.filter((keyword) => query.includes(keyword)).length;
  if (!phraseMatches && !keywordMatches && !uniqueMatches) return null;
  return {
    entry,
    score: phraseMatches * 60 + keywordMatches * 12 + uniqueMatches * 24 + entry.priority / 100,
    phraseMatches,
    keywordMatches,
    uniqueMatches,
  };
}

function sorted(matches: ScoredEntry[]) {
  return matches.sort((left, right) =>
    right.score - left.score ||
    right.entry.priority - left.entry.priority ||
    left.entry.intent.localeCompare(right.entry.intent, "ja-JP"),
  );
}

function candidates(matches: ScoredEntry[]) {
  return sorted(matches).slice(0, 3).map(({ entry }) => entry);
}

export function matchHelpIntent(
  rawQuery: string,
  catalog: readonly EditorHelpCatalogEntry[] = EDITOR_HELP_CATALOG,
): EditorHelpMatchResult {
  const query = normalizeHelpQuery(rawQuery);
  if (!query) return { kind: "fallback", confidence: "low", entries: commonHelpEntries(catalog) };

  const compiled = compileCatalog(catalog);

  const exact = compiled.filter(({ phrases }) => phrases.includes(query)).map(({ entry }) => entry);
  if (exact.length === 1) return { kind: "answer", confidence: "high", entry: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", confidence: "medium", entries: exact.slice(0, 3) };

  const phraseMatches = sorted(compiled.flatMap((entry) => {
    const match = scoreEntry(query, entry);
    return match?.phraseMatches ? [match] : [];
  }));
  if (phraseMatches.length === 1 || (phraseMatches[0] && phraseMatches[1] && phraseMatches[0].score - phraseMatches[1].score >= 20)) {
    return { kind: "answer", confidence: phraseMatches[0].phraseMatches > 1 ? "high" : "medium", entry: phraseMatches[0].entry };
  }
  if (phraseMatches.length > 1) {
    return { kind: "ambiguous", confidence: "medium", entries: candidates(phraseMatches) };
  }

  const keywordMatches = sorted(compiled.flatMap((entry) => {
    const match = scoreEntry(query, entry);
    return match ? [match] : [];
  }));
  if (!keywordMatches.length) {
    return { kind: "fallback", confidence: "low", entries: commonHelpEntries(catalog) };
  }

  const top = keywordMatches[0];
  const next = keywordMatches[1];
  if (!next) {
    return { kind: "answer", confidence: "medium", entry: top.entry };
  }
  const strong = top.keywordMatches >= 2 || top.uniqueMatches >= 1;
  const separated = !next || top.score - next.score >= 14;
  if (strong && separated) {
    return { kind: "answer", confidence: top.keywordMatches >= 2 ? "high" : "medium", entry: top.entry };
  }
  return { kind: "ambiguous", confidence: "low", entries: candidates(keywordMatches) };
}
