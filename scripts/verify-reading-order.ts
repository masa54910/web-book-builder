import fs from "node:fs";
import path from "node:path";

import { bookConfig } from "../src/config/bookConfig";
import { buildBookProject, extractChaptersFromText } from "../src/lib/bookProject";
import { importBook } from "../src/lib/book/importBook";
import { buildReaderPages } from "../src/lib/paginateText";

const root = process.cwd();
const dataRoot = path.join(root, "src", "data", "sample-book");
const failures: string[] = [];

function exists(relativePath: string) {
  return fs.existsSync(path.join(root, relativePath));
}

function readSample(name: string) {
  const fullPath = path.join(dataRoot, name);
  if (!fs.existsSync(fullPath)) {
    failures.push(`サンプルデータが存在しません: ${name}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

if (!exists("src/config/bookConfig.ts")) failures.push("bookConfig.ts が存在しません");
if (!bookConfig.bookId.trim()) failures.push("bookId が空です");
if (!bookConfig.title.trim()) failures.push("title が空です");
if (!bookConfig.author.trim()) failures.push("author が空です");
if (bookConfig.bindingDirection !== "rtl" && bookConfig.bindingDirection !== "ltr") {
  failures.push("bindingDirection は rtl または ltr である必要があります");
}
if (!["classic", "modern", "minimal"].includes(bookConfig.theme)) {
  failures.push("theme は classic / modern / minimal のいずれかである必要があります");
}
if (bookConfig.charactersPerPage < 120) failures.push("charactersPerPage が小さすぎます");
if (bookConfig.tableOfContentsItemsPerPage < 1) {
  failures.push("tableOfContentsItemsPerPage は1以上である必要があります");
}
if (bookConfig.coverImage && !exists(path.join("public", bookConfig.coverImage.replace(/^\//, "")))) {
  failures.push(`指定された表紙画像が存在しません: ${bookConfig.coverImage}`);
}

const book = importBook({
  text: readSample("book.txt"),
  chapterManifestCsv: readSample("article-manifest.csv"),
  imageManifestCsv: readSample("image-manifest.csv"),
});

if (book.chapters.length < 1) failures.push("章数が1未満です");

const orders = book.chapters.map((chapter) => chapter.order);
if (new Set(orders).size !== orders.length) failures.push("章orderが重複しています");
for (let index = 1; index < orders.length; index += 1) {
  if (orders[index] <= orders[index - 1]) failures.push("章orderが正しい昇順ではありません");
}

for (const chapter of book.chapters) {
  if (!chapter.id.trim()) failures.push(`章idが空です: ${chapter.title}`);
  if (!chapter.title.trim()) failures.push(`章titleが空です: order ${chapter.order}`);
  if (!chapter.source.trim()) failures.push(`章sourceが空です: ${chapter.title}`);
  if (!fs.existsSync(path.join(dataRoot, chapter.source))) {
    failures.push(`参照本文が存在しません: ${chapter.source}`);
  }
  if (!chapter.body.trim()) failures.push(`本文が空です: ${chapter.title}`);
}

for (const image of book.images) {
  if (!image.image_index.trim()) failures.push("画像IDが空です");
  if (image.local_path && !exists(path.join("public", image.local_path))) {
    failures.push(`画像manifestのファイルが存在しません: ${image.local_path}`);
  }
}

const pages = buildReaderPages({
  chapters: book.chapters,
  images: book.images,
  charactersPerPage: bookConfig.charactersPerPage,
  tableOfContentsItemsPerPage: bookConfig.tableOfContentsItemsPerPage,
});
if (pages.length < 1) failures.push("生成ページ数が1未満です");

const pageIds = new Set(pages.map((page) => page.id));
for (const chapter of book.chapters) {
  if (!pageIds.has(`chapter-${chapter.slug}`)) {
    failures.push(`目次ジャンプ先が存在しません: ${chapter.title}`);
  }
}

const generatedText = [
  bookConfig.bookId,
  bookConfig.title,
  bookConfig.author,
  ...book.chapters.map((chapter) => `${chapter.title}\n${chapter.body}`),
].join("\n");
if (/Trade for Life|tradeForLife|trade-for-life|45章|87画像/.test(generatedText)) {
  failures.push("Trade for Life 固有の固定値または文字列が残っています");
}

const dynamicProjectResult = buildBookProject({
  title: "検証用Webブック",
  subtitle: "Dynamic Preview",
  author: "Verifier",
  description: "動的BookProject検証",
  publisherName: "WebBookMaker",
  publishedAt: "2026",
  copyrightText: "verification only",
  rawText: [
    "# 第一章　生成",
    "",
    "本文です。",
    "",
    "[[image:sample-image]]",
    "",
    "# 第一章　生成",
    "",
    "同名章でも内部IDは重複しません。",
    "",
    "[[image:missing-image]]",
  ].join("\n"),
  bindingDirection: "ltr",
  theme: "modern",
  charactersPerPage: 260,
  tableOfContentsItemsPerPage: 1,
  images: [
    {
      id: "sample-image",
      fileName: "sample.png",
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      mimeType: "image/png",
      size: 24,
      caption: "検証画像",
      insertChapter: "1",
      orderInChapter: 1,
    },
  ],
});

if (!dynamicProjectResult.ok) {
  failures.push("動的BookProjectの生成に失敗しました");
} else {
  const dynamicProject = dynamicProjectResult.project;
  const slugs = dynamicProject.chapters.map((chapter) => chapter.slug);
  if (new Set(slugs).size !== slugs.length) {
    failures.push("動的BookProjectの章IDが重複しています");
  }
  if (!dynamicProject.missingImageIds.includes("missing-image")) {
    failures.push("不足画像IDを検出できていません");
  }
  const dynamicPages = buildReaderPages({
    chapters: dynamicProject.chapters,
    images: dynamicProject.images,
    charactersPerPage: dynamicProject.config.charactersPerPage,
    tableOfContentsItemsPerPage: dynamicProject.config.tableOfContentsItemsPerPage,
  });
  if (!dynamicPages.some((page) => page.kind === "image" && page.imageId === "sample-image")) {
    failures.push("登録済み画像IDがページ化されていません");
  }
  if (!dynamicPages.some((page) => page.kind === "image" && page.imageId === "missing-image" && page.missing)) {
    failures.push("不足画像IDのプレースホルダーが生成されていません");
  }
}

const noHeadingChapters = extractChaptersFromText("見出しなし本文です。", "作品タイトル");
if (noHeadingChapters.length !== 1 || noHeadingChapters[0]?.title !== "作品タイトル") {
  failures.push("見出しなし本文を1章として処理できていません");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`bookId: ${bookConfig.bookId}`);
  console.log(`title: ${bookConfig.title}`);
  console.log(`chapters: ${book.chapters.length}`);
  console.log(`images in manifest: ${book.images.length}`);
  console.log(`generated pages: ${pages.length}`);
  console.log("dynamic project verification: OK");
  console.log("generic book verification: OK");
}
