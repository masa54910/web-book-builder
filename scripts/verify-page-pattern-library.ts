import assert from "node:assert/strict";
import { assignPagePatterns, PAGE_PATTERN_LIBRARY } from "../src/lib/pagePatternLibrary";
const blocks = [
  { id: "a", type: "text", text: "表紙" },
  { id: "b", type: "text", text: "第1章 はじめに" },
  { id: "c", type: "image", text: "" },
  { id: "d", type: "text", text: "まとめ" },
] as never;
const assigned = assignPagePatterns(blocks);
assert.equal(PAGE_PATTERN_LIBRARY.length, 11);
assert.equal(assigned[0].pattern, "cover");
assert.equal(assigned[1].pattern, "chapter-opening");
assert.equal(assigned[2].pattern, "hero-image");
assert.equal(assigned[3].pattern, "closing");
console.log("Page Pattern Library verification passed.");
