import assert from "node:assert/strict";
import { buildShioriDesignBrief } from "../src/lib/shioriDesignBrief";
import { buildFullDesignProfile, mergeFullDesignOverrides, parseFullDesignBrief, readFullDesignRequest } from "../src/lib/fullDesignContract";
import { generateFullDesign } from "../src/lib/fullDesignPipeline";
import { DEFAULT_BOOK_DESIGN_SPEC, type BookDesignHistoryEntry } from "../src/lib/designSpec";
import { assessColumns } from "../src/lib/columnsSafety";
import type { BookColumnChildBlock } from "../src/lib/bookProject";
import type { ReaderColumnChild } from "../src/lib/types";
import { myDesignFromResult, parseMyDesignGrammar } from "../src/lib/myDesigns";
import { evaluateLayoutGeometry } from "../src/lib/layoutGeometry";
import { appendDesignHistory, normalizeDesignHistory, AI_BOOK_DESIGNER_MAX_HISTORY } from "../src/lib/aiBookDesigner";
import { fullPatternForPage } from "../src/lib/fullDesignPresentation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ColumnsPage from "../src/components/ColumnsPage";

async function main() {
  const brief = buildShioriDesignBrief({
    category: "magazine", audience: "幅広い読者", tone: "都会的でスタイリッシュ",
    contentBalance: "文章と画像を半々に", density: "余白を広くゆったり", cover: "タイトルを大きく",
    brightness: "明るく軽やか", decoration: "控えめなアクセント", emphasis: "章タイトル", avoid: "派手すぎる印象", genreDetails: {},
  })!;
  assert.deepEqual(parseFullDesignBrief(brief), brief);
  for (const bad of [null, [], { ...brief, rawText: "secret" }, { ...brief, category: "__proto__" }, { ...brief, tone: "a".repeat(161) }, { ...brief, writingMode: "vertical-rl" }]) {
    assert.equal(parseFullDesignBrief(bad), null);
  }
  const profile = buildFullDesignProfile({ textSample: "x".repeat(10000), rawText: "secret", price: 980, imageCount: Infinity });
  assert.equal(profile.textSample.length, 1200);
  assert.equal(profile.imageCount, 0);
  assert.ok(!JSON.stringify(profile).includes("secret"));
  for (const patch of [[], null, { contentBlocks: [] }, { cover: { titleTextOverride: "rewrite" } }, { page: { writingMode: "vertical-rl" } }, { page: { arbitraryCSS: "x" } }, { typography: { fontScale: "giant" } }]) {
    assert.equal(mergeFullDesignOverrides(DEFAULT_BOOK_DESIGN_SPEC, patch), null);
  }
  const original = JSON.stringify(brief);
  let calls = 0;
  const off = await generateFullDesign({ brief, profile: {}, apiEnabled: false, select: async () => { calls++; throw new Error("must not call"); } });
  assert.equal(calls, 0);
  assert.deepEqual(off.usage, { inputTokens: 0, outputTokens: 0, cachedTokens: 0 });
  assert.equal(off.model, null);
  assert.equal(off.spec.page.bindingDirection, "ltr");
  assert.equal(off.spec.page.marginScale, "wide");
  const on = await generateFullDesign({ brief, profile: {}, apiEnabled: true, select: async ({ candidates }) => {
    calls++;
    assert.ok(candidates.length <= 5);
    return { output: { selectedDesignSystemId: candidates[0].id, overrides: {} }, model: "gpt-5.4", usage: { inputTokens: 100, outputTokens: 10, cachedTokens: 20 } };
  } });
  assert.equal(calls, 1);
  const grammar = myDesignFromResult(brief, off)!;
  assert.ok(grammar);
  assert.deepEqual(parseMyDesignGrammar(JSON.parse(JSON.stringify(grammar))), grammar);
  const baseline = { id: "original", name: "Original", bookId: "qa", spec: DEFAULT_BOOK_DESIGN_SPEC, prompt: "", createdAt: "2026-09-11T00:00:00Z", active: false };
  let history: BookDesignHistoryEntry[] = [baseline];
  for (let index = 0; index < 40; index++) {
    history = appendDesignHistory(history, { ...baseline, id: `full-${index}`, name: "Full Design", fullDesign: grammar });
  }
  assert.equal(history.length, AI_BOOK_DESIGNER_MAX_HISTORY);
  assert.equal(history[0].id, "original");
  assert.equal(history.at(-1)?.id, "full-39");
  assert.equal(history.filter((entry) => entry.active).length, 1);
  assert.deepEqual(normalizeDesignHistory(JSON.parse(JSON.stringify(history))).map((entry) => entry.id), history.map((entry) => entry.id));
  for (const key of ["bookId", "rawText", "contentBlocks", "imageIds", "paywall", "stripe", "publication"]) {
    assert.equal(parseMyDesignGrammar({ ...grammar, [key]: "forbidden" }), null);
  }
  let criticCalls = 0;
  await generateFullDesign({ brief, profile: {}, apiEnabled: false,
    select: async () => { throw new Error("API OFF select"); },
    critique: async () => { throw new Error("API OFF critic"); },
  });
  const reviewed = await generateFullDesign({ brief, profile: {}, apiEnabled: true,
    select: async ({ candidates }) => ({ output: { selectedDesignSystemId: candidates[0].id, overrides: {} }, usage: on.usage, model: "gpt-5.4" }),
    critique: async () => { criticCalls++; return { output: { warnings: ["rhythm"] }, usage: { inputTokens: 20, outputTokens: 5, cachedTokens: 0 }, model: "gpt-5.4" }; },
  });
  assert.equal(criticCalls, 1);
  assert.deepEqual(reviewed.usage, { inputTokens: 120, outputTokens: 15, cachedTokens: 20 });
  assert.deepEqual(reviewed.critic?.ai, ["rhythm"]);
  assert.deepEqual(evaluateLayoutGeometry({ width: 0, height: 0, scrollWidth: 0, scrollHeight: 0 }), { measured: false, overflow: false });
  assert.equal(evaluateLayoutGeometry({ width: 200, height: 300, scrollWidth: 200, scrollHeight: 500 }).overflow, true);
  assert.equal(on.mode, "api-on");
  assert.equal(JSON.stringify(brief), original);
  await assert.rejects(generateFullDesign({ brief, profile: {}, apiEnabled: true, select: async () => ({ output: { selectedDesignSystemId: "invented", overrides: {} }, usage: on.usage, model: "gpt-5.4" }) }), /unknown-system/);
  assert.deepEqual(await readFullDesignRequest(new Request("https://test.local", { method: "POST", body: '{"ok":true}' })), { ok: true });
  await assert.rejects(readFullDesignRequest(new Request("https://test.local", { method: "POST", body: "a".repeat(24001) })), /request-too-large/);
  const canonical: BookColumnChildBlock[] = [{ id: "a", type: "text", content: "本文 ".repeat(120) }];
  const reader: ReaderColumnChild[] = [{ id: "a", kind: "text", paragraphs: ["本文 ".repeat(120)] }];
  const media: BookColumnChildBlock[] = [{ id: "m", type: "youtube", videoId: "abcdefghijk", originalUrl: "https://youtu.be/abcdefghijk" }];
  const readerMedia: ReaderColumnChild[] = [{ id: "m", kind: "youtube", videoId: "abcdefghijk", originalUrl: "https://youtu.be/abcdefghijk" }];
  assert.deepEqual(assessColumns(canonical, media), assessColumns(reader, readerMedia));
  assert.equal(assessColumns(canonical, media).fallback, false);
  assert.equal(assessColumns([], reader).fallback, true);
  assert.equal(assessColumns([{ id: "x", type: "text", content: "  " }], reader).fallback, true);
  const left: ReaderColumnChild[] = [{ id: "left", kind: "text", paragraphs: ["LEFT_CONTENT"] }];
  const right: ReaderColumnChild[] = [{ id: "right", kind: "text", paragraphs: ["RIGHT_CONTENT"] }];
  const page = { id: "columns-page", chapterTitle: "QA", kind: "columns" as const, ratio: "50-50" as const, left, right, columnsBlockId: "columns-source" };
  assert.equal(fullPatternForPage(page, [{ blockId: "columns-source", pattern: "standard-text", reason: "safe fallback", issues: [] }]), "standard-text");
  assert.equal(fullPatternForPage(page, null), undefined);
  const beforeColumns = JSON.stringify(page);
  const fallbackHTML = renderToStaticMarkup(createElement(ColumnsPage, { ...page, forceSingleColumn: true }));
  assert.match(fallbackHTML, /data-layout-fallback="standard-text"/);
  assert.ok(fallbackHTML.indexOf("LEFT_CONTENT") < fallbackHTML.indexOf("RIGHT_CONTENT"));
  assert.ok(!fallbackHTML.includes('data-columns-side="right"'));
  assert.equal(JSON.stringify(page), beforeColumns);
  const normalHTML = renderToStaticMarkup(createElement(ColumnsPage, page));
  assert.ok(normalHTML.includes('data-columns-side="right"'));
  assert.ok(!normalHTML.includes('data-layout-fallback'));
  console.log("Full Design contract / API OFF / selection / payload limits / shared Columns checks PASS");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
