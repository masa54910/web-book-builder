import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import {
  EDITOR_GUIDANCE_ACTION_IDS,
  EDITOR_HELP_ACTION_IDS,
} from "../src/lib/editorGuidance/actionIds";
import { getEditorHelpActionDefinition } from "../src/lib/editorGuidance/actionRegistry";
import {
  commonHelpEntries,
  EDITOR_HELP_CATALOG,
} from "../src/lib/editorGuidance/helpCatalog";
import { matchHelpIntent } from "../src/lib/editorGuidance/helpMatcher";
import { normalizeHelpQuery } from "../src/lib/editorGuidance/helpNormalize";

const catalog = EDITOR_HELP_CATALOG;
assert.ok(catalog.length >= 30, `catalog must have at least 30 intents: ${catalog.length}`);

const intents = new Set<string>();
const phrases = new Set<string>();
const knownActions = new Set<string>([
  ...Object.values(EDITOR_GUIDANCE_ACTION_IDS),
  ...Object.values(EDITOR_HELP_ACTION_IDS),
]);
for (const entry of catalog) {
  assert.ok(!intents.has(entry.intent), `duplicate intent: ${entry.intent}`);
  intents.add(entry.intent);
  assert.equal(entry.locale, "ja-JP", `invalid locale: ${entry.intent}`);
  assert.ok(entry.title.trim(), `empty title: ${entry.intent}`);
  assert.ok(entry.answer.trim(), `empty answer: ${entry.intent}`);
  assert.ok(entry.answer.length <= 260, `answer too long: ${entry.intent}`);
  assert.ok(Number.isFinite(entry.priority) && entry.priority >= 0 && entry.priority <= 100, `invalid priority: ${entry.intent}`);
  assert.ok(entry.keywords.length > 0, `empty keywords: ${entry.intent}`);
  for (const keyword of entry.keywords) assert.ok(keyword.trim(), `blank keyword: ${entry.intent}`);
  for (const phrase of entry.phrases) {
    const normalized = normalizeHelpQuery(phrase);
    assert.ok(normalized, `blank phrase: ${entry.intent}`);
    assert.ok(!phrases.has(normalized), `duplicate exact phrase: ${phrase}`);
    phrases.add(normalized);
  }
  if (entry.actionId) {
    assert.ok(knownActions.has(entry.actionId), `unknown actionId: ${entry.actionId}`);
    const definition = getEditorHelpActionDefinition(entry.actionId);
    assert.ok(definition, `missing Help action definition: ${entry.actionId}`);
    assert.ok(definition.buttonLabel.trim(), `empty Help action label: ${entry.actionId}`);
    assert.ok(definition.ariaLabel.trim(), `empty Help action aria-label: ${entry.actionId}`);
  }
  if (entry.route) assert.match(entry.route, /^\/[a-z0-9][a-z0-9/.-]*$/u, `invalid route: ${entry.route}`);
}

const requiredIntents = [
  "manuscript.paste", "manuscript.import", "smart.format", "smart.undo",
  "image.insert", "image.reupload", "image.size", "youtube.insert",
  "text.bold", "text.color", "text.size", "page.break", "columns.insert",
  "paywall.insert", "paywall.remove", "cover.edit", "toc", "save",
  "preview", "publish", "slug", "autosave",
] as const;
for (const intent of requiredIntents) assert.ok(intents.has(intent), `missing required intent: ${intent}`);

function answerIntent(query: string) {
  const result = matchHelpIntent(query, catalog);
  assert.equal(result.kind, "answer", `expected answer for: ${query}; got ${result.kind}`);
  return result.kind === "answer" ? result.entry.intent : "";
}

function ambiguousIntents(query: string) {
  const result = matchHelpIntent(query, catalog);
  assert.equal(result.kind, "ambiguous", `expected ambiguous for: ${query}; got ${result.kind}`);
  return result.kind === "ambiguous" ? result.entries.map((entry) => entry.intent) : [];
}

const fixtures: readonly (readonly [string, string])[] = [
  ["文章を貼り付けたい", "manuscript.paste"], ["原稿をペーストしたい", "manuscript.paste"],
  ["ファイルを読み込みたい", "manuscript.import"], ["ＷＯＲＤを読み込みたい", "manuscript.import"],
  ["PDFを読み込みたい", "manuscript.import"], ["自動で整えたい", "smart.format"],
  ["ＳＭＡＲＴ　ＦＯＲＭＡＴを使いたい", "smart.format"], ["章を認識させたい", "smart.format"],
  ["整形前に戻したい", "smart.undo"], ["自動整形を元に戻したい", "smart.undo"],
  ["画像を入れたい", "image.insert"], ["写真を入れたい", "image.insert"],
  ["画像を再アップロードしたい", "image.reupload"], ["pending画像を直したい", "image.reupload"],
  ["画像サイズ", "image.size"], ["画像を大きくしたい", "image.size"],
  ["YouTubeを貼りたい", "youtube.insert"], ["動画を入れたい", "youtube.insert"],
  ["文字を太字にしたい", "text.bold"], ["boldにしたい", "text.bold"],
  ["文字色を変えたい", "text.color"], ["テキストカラーを変えたい", "text.color"],
  ["文字サイズを変えたい", "text.size"], ["一部の文字を大きくしたい", "text.size"],
  ["改ページしたい", "page.break"], ["ここでページを変えたい", "page.break"],
  ["2カラムを入れたい", "columns.insert"], ["二段組にしたい", "columns.insert"],
  ["カラム比率を変えたい", "columns.ratio"], ["４０：６０にしたい", "columns.ratio"],
  ["カラムの左右を入れ替えたい", "columns.swap"], ["2カラムを反転したい", "columns.swap"],
  ["ここから有料にしたい", "paywall.insert"], ["続きを有料にしたい", "paywall.insert"],
  ["有料にしたい", "paywall.insert"],
  ["Paywallを削除したい", "paywall.remove"], ["無料に戻したい", "paywall.remove"],
  ["表紙を変えたい", "cover.edit"], ["表紙画像", "cover.edit"],
  ["目次がおかしい", "toc"], ["目次を作りたい", "toc"],
  ["作品を保存したい", "save"], ["セーブしたい", "save"],
  ["プレビューしたい", "preview"], ["読者画面を見たい", "preview"],
  ["Webブックを公開したい", "publish"], ["URLを発行したい", "publish"],
  ["URLを変えたい", "slug"], ["公開URLを変更したい", "slug"],
  ["自動保存について知りたい", "autosave"], ["途中から復元したい", "autosave"],
  ["背景を変えたい", "design.background"], ["白背景にしたい", "design.background"],
  ["フォントを変えたい", "design.font"], ["明朝体にしたい", "design.font"],
  ["アクセス解析", "analytics"], ["どこまで読まれたか知りたい", "analytics"],
  ["URLを共有したい", "share"], ["URLをコピーしたい", "share"],
  ["SNSでシェアしたい", "share"], ["QRコードを作りたい", "qr"],
  ["名刺にQRを載せたい", "qr"], ["販売URLを設定したい", "sales.external"],
  ["購入先を設定したい", "sales.external"], ["画像を販売したい", "sales.external"],
  ["有料URL", "sales.external"], ["外部リンクを追加したい", "external.links"],
  ["作品の最後にリンクを載せたい", "external.links"], ["章見出しを大きくしたい", "chapter.heading"],
  ["チャプター見出しを変えたい", "chapter.heading"], ["作者プロフィールを変えたい", "author.profile"],
  ["作者ページを設定したい", "author.profile"], ["作品を複製したい", "book.duplicate"],
  ["本をコピーしたい", "book.duplicate"], ["料金を知りたい", "pricing"],
  ["いくらかかる", "pricing"], ["ヘルプページを開きたい", "help"],
  ["操作方法を知りたい", "help"], ["活用事例を見たい", "use.cases"],
  ["何に使えるか知りたい", "use.cases"], ["AIで文章を書き直したい", "unsupported.ai-rewrite"],
  ["AIに書いてほしい", "unsupported.ai-generate"], ["ブロックをドラッグで並べ替えたい", "unsupported.drag-reorder"],
  ["Redoしたい", "unsupported.redo"], ["一括置換したい", "unsupported.search-replace"],
];
for (const [query, intent] of fixtures) assert.equal(answerIntent(query), intent, query);

const salesCandidates = ambiguousIntents("販売したい");
assert.ok(salesCandidates.includes("paywall.insert"));
assert.ok(salesCandidates.includes("sales.external"));
const imageCandidates = ambiguousIntents("画像");
assert.ok(imageCandidates.includes("image.insert"));
assert.ok(imageCandidates.includes("image.size"));
assert.ok(imageCandidates.includes("image.reupload"));

for (const query of ["本", "ページ", "設定", "変更", "存在しない不思議な操作"]) {
  const result = matchHelpIntent(query, catalog);
  assert.equal(result.kind, "fallback", `generic/no-match query must fallback: ${query}`);
  assert.equal(result.entries.length, 6);
}

assert.equal(normalizeHelpQuery("　ＵＲＬを変えたい？！  "), "urlを変えたい");
assert.equal(normalizeHelpQuery("ＹｏｕＴｕｂｅ　を　貼りたい"), "youtube を 貼りたい");
assert.equal(commonHelpEntries(catalog).length, 6);
assert.equal(catalog.find((entry) => entry.intent === "pricing")?.route, "/pricing");
assert.equal(catalog.find((entry) => entry.intent === "analytics")?.route, "/analytics");
assert.equal(catalog.find((entry) => entry.intent === "help")?.route, "/help");
assert.equal(catalog.find((entry) => entry.intent === "use.cases")?.route, "/use-cases");
assert.ok(catalog.filter((entry) => entry.unsupported).length >= 5);
assert.ok(catalog.every((entry) => !/12ジャンル|accent color|テーマがあります/iu.test(entry.answer)));

const deterministicQueries = fixtures.slice(0, 20).map(([query]) => query).concat(["販売したい", "画像", "不明な操作"]);
for (const query of deterministicQueries) {
  assert.deepEqual(matchHelpIntent(query, catalog), matchHelpIntent(query, catalog), `non-deterministic: ${query}`);
}

const performanceQueries = Array.from({ length: 10_000 }, (_, index) => fixtures[index % fixtures.length][0]);
const startedAt = performance.now();
for (const query of performanceQueries) matchHelpIntent(query, catalog);
const elapsedMs = performance.now() - startedAt;
assert.ok(elapsedMs < 5_000, `10,000 queries took too long: ${elapsedMs.toFixed(1)}ms`);

console.log(`Editor Help verification passed: ${catalog.length} intents, ${fixtures.length} fixtures, 10,000 queries in ${elapsedMs.toFixed(1)}ms.`);
