import type { ShioriDesignBrief } from "@/lib/shioriDesignBrief";
import type { BookDesignSpec } from "@/lib/designSpec";
import { matchDesignSystems } from "@/lib/designSystemLibrary";
import { buildFullDesignProfile, isPlainRecord, mergeFullDesignOverrides, type FullDesignProfile } from "@/lib/fullDesignContract";

export type FullDesignMode = "api-off" | "api-on" | "my-design";
export type DesignTokenUsage = { inputTokens: number; outputTokens: number; cachedTokens: number };
export const ZERO_DESIGN_USAGE: DesignTokenUsage = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
export type FullDesignResult = {
  version: 1; mode: FullDesignMode; selectedDesignSystemId: string; selectedDesignSystemName: string;
  spec: BookDesignSpec; usage: DesignTokenUsage; model: string | null; brief: ShioriDesignBrief;
  critic?: { deterministic: string[]; ai: string[] | null };
};
export type FullDesignSelectionInput = {
  brief: ShioriDesignBrief; profile: FullDesignProfile;
  candidates: Array<{ id: string; name: string; description: string; score: number; baseSpec: BookDesignSpec }>;
};
export type FullDesignSelector = (input: FullDesignSelectionInput) => Promise<{ output: unknown; usage: DesignTokenUsage; model: string }>;
export const FULL_DESIGN_CRITIC_CODES = ["density", "contrast", "image-emphasis", "rhythm"] as const;
export const FULL_DESIGN_CRITIC_LABELS: Record<string, string> = {
  density: "文字量と読みやすさをPreviewで確認してください。",
  contrast: "文字と背景のコントラストを確認してください。",
  "image-emphasis": "画像と文章のバランスを確認してください。",
  rhythm: "章ごとの変化と余白のリズムを確認してください。",
};
export type FullDesignCritic = (input: { spec: BookDesignSpec; statistics: Pick<FullDesignProfile, "imageCount" | "pageCount" | "characterCount" | "contentBlockCount">; deterministic: string[] }) => Promise<{ output: unknown; usage: DesignTokenUsage; model: string }>;

/** API-free overrides represent answers, never add or rewrite manuscript text. */
export function ruleBasedFullDesignOverrides(brief: ShioriDesignBrief) {
  const airy = brief.density === "余白を広くゆったり";
  const compact = brief.density === "情報をコンパクトに";
  return {
    page: {
      marginScale: airy ? "wide" : compact ? "compact" : "standard",
      paragraphSpacing: airy ? "wide" : compact ? "compact" : "normal",
      ...(brief.brightness === "明るく軽やか" ? { background: "white" } : {}),
    },
    typography: { lineHeight: airy ? "relaxed" : "normal" },
    ...(brief.contentBalance === "画像を主役に" ? { image: { layout: "contained" } } : {}),
  };
}

/** Selector is unreachable in OFF mode, including model/configuration failures.
 * This stage returns design tokens only. Shared Layout Safety must still run
 * against the local canonical blocks before Preview/Apply. */
export async function generateFullDesign(input: {
  brief: ShioriDesignBrief; profile: unknown; apiEnabled: boolean; select?: FullDesignSelector; critique?: FullDesignCritic;
}): Promise<FullDesignResult> {
  const candidates = matchDesignSystems(input.brief, 5);
  let selected = candidates[0].system;
  let rawOverrides: unknown = ruleBasedFullDesignOverrides(input.brief);
  let usage = { ...ZERO_DESIGN_USAGE };
  let model: string | null = null;
  if (input.apiEnabled) {
    if (!input.select) throw new Error("provider-unavailable");
    const result = await input.select({
      brief: input.brief, profile: buildFullDesignProfile(input.profile),
      candidates: candidates.map(({ system, score }) => ({
        id: system.id, name: system.name, description: system.description, score, baseSpec: system.spec,
      })),
    });
    if (!isPlainRecord(result.output) || Object.keys(result.output).some((key) => !["selectedDesignSystemId", "overrides"].includes(key))) throw new Error("invalid-selection");
    const selectedId = result.output.selectedDesignSystemId;
    const candidate = candidates.find(({ system }) => system.id === selectedId);
    if (!candidate) throw new Error("unknown-system");
    selected = candidate.system;
    rawOverrides = result.output.overrides;
    usage = result.usage;
    model = result.model;
  }
  const spec = mergeFullDesignOverrides(selected.spec, rawOverrides);
  if (!spec) throw new Error("invalid-overrides");
  // Rule-based review always precedes the optional AI review. Actual
  // geometric review still runs in the Renderer using canonical content.
  const profile = buildFullDesignProfile(input.profile);
  const deterministic: string[] = [];
  if (profile.imageCount === 0 && spec.genre === "photo_book") deterministic.push("image-emphasis");
  if (spec.typography.fontScale === "small" && input.brief.audience === "初心者・はじめての方") deterministic.push("density");
  let ai: string[] | null = null;
  if (input.apiEnabled && input.critique) {
    const review = await input.critique({
      spec, statistics: { imageCount: profile.imageCount, pageCount: profile.pageCount, characterCount: profile.characterCount, contentBlockCount: profile.contentBlockCount }, deterministic,
    });
    if (!isPlainRecord(review.output) || Object.keys(review.output).some((key) => key !== "warnings")
      || !Array.isArray(review.output.warnings) || review.output.warnings.length > 4
      || review.output.warnings.some((code) => !FULL_DESIGN_CRITIC_CODES.includes(code))) throw new Error("invalid-critic");
    ai = review.output.warnings as string[];
    usage = { inputTokens: usage.inputTokens + review.usage.inputTokens, outputTokens: usage.outputTokens + review.usage.outputTokens, cachedTokens: usage.cachedTokens + review.usage.cachedTokens };
  }
  return {
    version: 1, mode: input.apiEnabled ? "api-on" : "api-off",
    selectedDesignSystemId: selected.id, selectedDesignSystemName: selected.name, spec, usage, model, brief: input.brief, critic: { deterministic, ai },
  };
}
