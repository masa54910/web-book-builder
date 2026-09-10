import assert from "node:assert/strict";
import { DESIGN_SYSTEM_LIBRARY, matchDesignSystems, validateDesignSystemLibrary } from "../src/lib/designSystemLibrary";
assert.equal(DESIGN_SYSTEM_LIBRARY.length, 6);
assert.equal(validateDesignSystemLibrary(), true);
const matches = matchDesignSystems({ version: 1, category: "novel", audience: "幅広い読者", tone: "落ち着いた上品な", contentBalance: "文章を主役に", density: "余白を広くゆったり", cover: "余白を活かして上品に", brightness: "自然でニュートラル", decoration: "最小限でシンプル", emphasis: "章タイトル", avoid: "派手すぎる印象", genreDetails: {}, writingMode: "horizontal-tb", bindingDirection: "ltr" });
assert.equal(matches[0].system.id, "LITERARY-PAPERBACK");
console.log("Design System Library verification passed.");
