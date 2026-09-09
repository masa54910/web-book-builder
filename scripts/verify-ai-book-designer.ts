import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendDesignHistory, applyDesignSpecToState, buildDesignContext } from "../src/lib/aiBookDesigner";
import { DEFAULT_BOOK_DESIGN_SPEC, parseBookDesignSpec } from "../src/lib/designSpec";
import { BOOK_DESIGN_PRESETS, getBookDesignPreset, getBookDesignPresetCatalog } from "../src/lib/designPresets";

assert.equal(BOOK_DESIGN_PRESETS.length, 26);
assert.equal(new Set(BOOK_DESIGN_PRESETS.map((preset) => preset.id)).size, 26);
assert.equal(new Set(BOOK_DESIGN_PRESETS.map((preset) => preset.category)).size, 6);
assert.deepEqual(getBookDesignPreset("NOT-A-PRESET"), undefined);
assert.equal(getBookDesignPresetCatalog().every((preset) => !("spec" in preset)), true);
for (const preset of BOOK_DESIGN_PRESETS) {
  const presetSpec = parseBookDesignSpec(preset.spec);
  assert.equal(presetSpec.success, true, `${preset.id} must pass BookDesignSpec validation`);
}

const parsed = parseBookDesignSpec(DEFAULT_BOOK_DESIGN_SPEC);
assert.equal(parsed.success, true);

const original = {
  title: "Protected title",
  rawText: "本文は変更されない",
  theme: "classic" as const,
  bindingDirection: "rtl" as const,
  fontFamily: "mincho" as const,
  fontScale: "medium" as const,
  lineHeight: "normal" as const,
  marginScale: "standard" as const,
  pageWidth: "standard" as const,
  background: "paper" as const,
  textColor: "#2f251d",
  accentColor: "#6bb9ad",
  coverStyle: "overlay" as const,
  imageLayout: "framed" as const,
  coverDesign: { ...DEFAULT_BOOK_DESIGN_SPEC.cover },
};
const next = applyDesignSpecToState(original, { ...DEFAULT_BOOK_DESIGN_SPEC, theme: "modern", typography: { ...DEFAULT_BOOK_DESIGN_SPEC.typography, fontFamily: "sans" } });
assert.equal(next.title, original.title);
assert.equal(next.rawText, original.rawText);
assert.equal(next.theme, "modern");
assert.equal(next.fontFamily, "sans");

const history = appendDesignHistory([], { id: "ai-1", bookId: "book-1", spec: DEFAULT_BOOK_DESIGN_SPEC, prompt: "simple", createdAt: new Date().toISOString(), active: true });
assert.equal(history.length, 1);
assert.equal(history[0].active, true);

const context = buildDesignContext({ title: original.title, description: "説明", rawText: original.rawText, contentBlocks: [{ id: "text-1", type: "text", content: "章", structureRole: "chapter" }], current: original });
assert.deepEqual(context.chapterTitles, ["章"]);
assert.equal("paymentData" in context, false);
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/020_ai_book_designer_usage.sql"), "utf8");
assert.match(migration, /create table if not exists public\.ai_book_designer_usage/);
assert.match(migration, /enable row level security/);
assert.match(migration, /consume_ai_book_designer_quota/);
const route = readFileSync(resolve(process.cwd(), "src/app/api/ai/book-designer/route.ts"), "utf8");
assert.match(route, /OPENAI_API_KEY/);
assert.match(route, /AI_BOOK_DESIGNER_ENABLED/);
assert.match(route, /OPENAI_BOOK_DESIGNER_MODEL/);
assert.doesNotMatch(route, /NEXT_PUBLIC_OPENAI/);
assert.match(route, /getBookDesignPresetCatalog/);
assert.match(route, /unknown-preset/);
assert.match(route, /theme: classic \| modern \| minimal \| magazine \| novel \| photo \| research \| portfolio/);
assert.match(route, /readerMode: book \| scroll \| magazine \| photo/);
assert.match(route, /cover: \{ coverStyle: overlay \| solid \| band/);
const openAiRequestIndex = route.indexOf('fetch("https://api.openai.com/v1/chat/completions"');
const specValidationIndex = route.indexOf("const spec = parseBookDesignSpec(envelope.spec);");
const quotaRpcIndex = route.indexOf('rpc("consume_ai_book_designer_quota"');
const responseIndex = route.indexOf("return NextResponse.json({ spec: spec.data");
assert.ok(openAiRequestIndex >= 0);
assert.ok(specValidationIndex > openAiRequestIndex);
assert.ok(quotaRpcIndex > specValidationIndex, "quota must be consumed after valid spec parsing");
assert.ok(responseIndex > quotaRpcIndex);
assert.match(migration, /on conflict \(user_id, usage_date\)/i);
assert.match(migration, /next_count > p_limit/);
assert.match(route, /stage=response-json-parse/);
assert.match(route, /stage=missing-content/);
assert.match(route, /stage=design-spec-json-parse/);
assert.match(route, /stage=design-spec-validation/);
assert.match(route, /reason=\$\{safeValidationReason\(spec\.error\)\}/);
console.log("AI Book Designer safety verification passed.");
