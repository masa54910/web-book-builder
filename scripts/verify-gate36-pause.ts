import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_BOOK_DESIGN_SPEC } from "../src/lib/designSpec";
import { normalizeAIBookDesignerSpecForPausedVertical } from "../src/lib/aiBookDesigner";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const editor = read("src/components/DashboardBookEditor.tsx");
const route = read("src/app/api/ai/book-designer/route.ts");
const presets = read("src/lib/designPresets.ts");
const ai = read("src/lib/aiBookDesigner.ts");

assert.doesNotMatch(editor, /<option value="vertical-rl">/);
assert.doesNotMatch(editor, /<span>文字方向<\/span>/);
assert.match(editor, /writingMode: record\.bookProject\.config\.writingMode/);
assert.match(editor, /writingMode: payload\.writingMode \|\| state\.writingMode/);
assert.match(route, /writingMode: horizontal-tb,/);
assert.match(route, /normalizeAIBookDesignerSpecForPausedVertical/);
assert.match(ai, /Gate36 is paused in Production/);
assert.match(presets, /preset\("NOV-01"/);
assert.match(presets, /writingMode: "vertical-rl"/);
assert.equal(normalizeAIBookDesignerSpecForPausedVertical(DEFAULT_BOOK_DESIGN_SPEC).page.writingMode, "horizontal-tb");

console.log("Gate36 pause verification passed: vertical UI hidden, AI output normalized, compatibility retained.");
