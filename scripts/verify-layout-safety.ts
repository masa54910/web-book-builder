import assert from "node:assert/strict";
import { assignPagePatterns } from "../src/lib/pagePatternLibrary";
import { safePagePatterns } from "../src/lib/layoutSafety";
const blocks = [{ id: "a", type: "text", content: "本文" }, { id: "c", type: "columns", ratio: "50-50", left: { blocks: [] }, right: { blocks: [{ id: "r", type: "text", content: "右" }] } }] as never;
const result = safePagePatterns(blocks, assignPagePatterns(blocks));
assert.equal(result[1].pattern, "standard-text");
assert.equal(result[1].fallback, "standard-text");
console.log("Layout Safety verification passed.");
