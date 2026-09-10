import assert from "node:assert/strict";
import { runRuleBasedLayoutCritic } from "../src/lib/layoutCritic";
const blocks = [{ id: "a", type: "columns", ratio: "50-50", left: { blocks: [] }, right: { blocks: [{ id: "r", type: "text", content: "本文" }] } }] as never;
const result = runRuleBasedLayoutCritic(blocks);
assert.equal(result.passed, false);
assert.equal(result.repairedPatterns[0].fallback, "standard-text");
assert.deepEqual((blocks as Array<{ left: { blocks: unknown[] } }>)[0].left.blocks, []);
console.log("Rule-based Layout Critic verification passed.");
