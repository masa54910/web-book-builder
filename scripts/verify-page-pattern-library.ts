import assert from "node:assert/strict";
import type { BookContentBlock } from "../src/lib/bookProject";
import { assignPagePatterns, PAGE_PATTERN_LIBRARY } from "../src/lib/pagePatternLibrary";
const blocks: BookContentBlock[] = [
  { id: "a", type: "text", content: "本文の先頭は表紙ではありません。" },
  { id: "b", type: "text", content: "第1章 はじめに" },
  { id: "c", type: "image", storagePath: "fixture/chart.png", fileName: "chart.png", mimeType: "image/png", width: 800, height: 600, fitMode: "contain", pageMode: "full-page" },
  { id: "d", type: "text", content: "まとめ" },
  { id: "e", type: "text", content: "文章中のchapterという語や「会話」は章扉・引用ではない。" },
  { id: "f", type: "text", content: "## 小見出し" },
];
const before = JSON.stringify(blocks);
const assigned = assignPagePatterns(blocks);
assert.equal(PAGE_PATTERN_LIBRARY.length, 11);
assert.equal(assigned[0].pattern, "standard-text");
assert.equal(assigned[1].pattern, "chapter-opening");
assert.equal(assigned[2].pattern, "hero-image");
assert.equal(assigned[3].pattern, "closing");
assert.equal(assigned[4].pattern, "standard-text");
assert.equal(assigned[5].pattern, "standard-text");
assert.deepEqual(assigned.map((item) => item.blockId), blocks.map((block) => block.id));
assert.equal(JSON.stringify(blocks), before);
console.log("Page Pattern Library verification passed.");
