import assert from "node:assert/strict";
import { buildShioriDesignBrief, createInitialShioriAnswers, summarizeShioriBrief } from "../src/lib/shioriDesignBrief";

const answers = {
  ...createInitialShioriAnswers(), category: "magazine" as const, audience: "幅広い読者", tone: "都会的でスタイリッシュ",
  contentBalance: "文章と画像を半々に", density: "標準的で読みやすく", cover: "タイトルを大きく",
  brightness: "明るく軽やか", decoration: "控えめなアクセント", emphasis: "章タイトル", avoid: "派手すぎる印象",
};
const brief = buildShioriDesignBrief(answers);
assert.ok(brief);
assert.equal(brief.writingMode, "horizontal-tb");
assert.equal(brief.bindingDirection, "ltr");
assert.match(summarizeShioriBrief(brief), /雑誌/);
assert.equal(buildShioriDesignBrief(createInitialShioriAnswers()), null);
console.log("Shiori Design Brief verification passed.");
