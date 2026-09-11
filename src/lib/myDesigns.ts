import { DESIGN_SYSTEM_LIBRARY } from "@/lib/designSystemLibrary";
import { isPlainRecord, mergeFullDesignOverrides, parseFullDesignBrief } from "@/lib/fullDesignContract";
import { parseBookDesignSpec, type BookDesignSpec } from "@/lib/designSpec";
import type { ShioriDesignBrief } from "@/lib/shioriDesignBrief";
import type { FullDesignResult } from "@/lib/fullDesignPipeline";
import { sanitizeBookDesignOverrides } from "@/lib/designPresets";

export type MyDesignGrammar = { version: 1; baseSystemId: string; brief: ShioriDesignBrief; spec: BookDesignSpec };
export type MyDesign = { id: string; name: string; grammar: MyDesignGrammar; createdAt: string; updatedAt: string };

/** Reuse system grammar, never a source Book's layout/identity/content snapshot. */
export function parseMyDesignGrammar(value: unknown): MyDesignGrammar | null {
  if (!isPlainRecord(value) || value.version !== 1 || Object.keys(value).some((key) => !["version", "baseSystemId", "brief", "spec"].includes(key))) return null;
  const system = DESIGN_SYSTEM_LIBRARY.find((item) => item.id === value.baseSystemId);
  const brief = parseFullDesignBrief(value.brief);
  if (!isPlainRecord(value.spec)) return null;
  const { version: specVersion, ...specFields } = value.spec;
  if (specVersion !== 1 || !sanitizeBookDesignOverrides(specFields)) return null;
  const parsed = parseBookDesignSpec(value.spec);
  if (!system || !brief || !parsed.success || parsed.data.cover.titleTextOverride) return null;
  const spec = mergeFullDesignOverrides(parsed.data, {});
  if (!spec) return null;
  return { version: 1, baseSystemId: system.id, brief, spec };
}

export function myDesignFromResult(brief: ShioriDesignBrief, result: FullDesignResult): MyDesignGrammar | null {
  return parseMyDesignGrammar({ version: 1, baseSystemId: result.selectedDesignSystemId, brief, spec: result.spec });
}
