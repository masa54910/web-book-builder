import assert from "node:assert/strict";
import fs from "node:fs";
import { BOOK_TEMPLATES, getBookTemplate } from "../src/lib/templateCatalog";
import { createTemplatePayload, loadCatalogSample } from "../src/lib/templateBooks";
import { buildBookProjectFromCanonicalPayload } from "../src/lib/canonicalBook";
import { buildReaderPages } from "../src/lib/paginateText";
import { applyDesignSpecToState } from "../src/lib/aiBookDesigner";
import { getBookDesignPreset } from "../src/lib/designPresets";

assert.equal(BOOK_TEMPLATES.length, 9);
assert.equal(new Set(BOOK_TEMPLATES.map((t) => t.id)).size, 9);
for (const id of [undefined, null, {}, "unknown", "../../books", "555f4555-a937-4c0a-a2fd-2ce4f2c5a526"]) {
  assert.equal(getBookTemplate(id), undefined);
  assert.throws(() => createTemplatePayload(id));
}
const identities = new Set<string>();
for (const template of BOOK_TEMPLATES) {
  const before = JSON.stringify(template);
  const sample = loadCatalogSample(template.id);
  assert(sample.chapters.length >= template.sections.length);
  if (template.id === "teacher") assert.equal(sample.chapters.length, template.sections.length + 2);
  assert.equal(sample.config.bindingDirection, "ltr");
  assert.equal(sample.config.writingMode, "horizontal-tb");
  assert.equal(sample.missingImageIds.length, 0);
  const pages = buildReaderPages({ chapters: sample.chapters, images: sample.images, contentBlocks: sample.contentBlocks, charactersPerPage: sample.config.charactersPerPage, tableOfContentsItemsPerPage: 6 });
  assert(pages.some((p) => p.kind === "text"));
  assert(pages.some((p) => p.kind === "image"));
  assert.equal(new Set(pages.map((p) => p.id)).size, pages.length);
  for (const image of [template.coverImage, ...sample.images.map((i) => i.image_url)]) {
    assert(image.startsWith(`/sample-books/${template.id}/`));
    assert(fs.existsSync(`public${image}`), `Missing ${image}`);
    assert(fs.statSync(`public${image}`).size < 350_000);
  }
  // Three independent invocations model two creations by A and one by B.
  for (let attempt = 0; attempt < 3; attempt++) {
    const starter = createTemplatePayload(template.id);
    for (const id of [starter.bookId!, ...starter.contentBlocks.map((b) => b.id), ...starter.assets.map((a) => a.id), starter.coverAsset!.id]) {
      assert(!identities.has(id), `identity collision: ${id}`);
      identities.add(id);
    }
    assert.equal(starter.authorName, "");
    assert.equal(starter.authorHandle, "");
    assert.match(starter.slug, new RegExp(`^template-${template.id}-`));
    assert.equal(starter.publishedAt, "");
    assert.equal(starter.externalSalesUrl, "");
    assert.deepEqual(starter.publication, { status: "draft", visibility: "private" });
    assert.deepEqual(starter.designHistory, []);
    assert(!starter.contentBlocks.some((b) => b.type === "paywall"));
    const reloaded = JSON.parse(JSON.stringify(starter));
    assert.equal(JSON.stringify(reloaded), JSON.stringify(starter));
    const build = buildBookProjectFromCanonicalPayload(reloaded);
    assert(build.ok);
    if (build.ok) {
      assert.equal(build.project.chapters.length, template.sections.length);
      assert.equal(build.project.config.monetization?.enabled, false);
      assert.equal(build.project.missingImageIds.length, 0);
      assert.equal(build.project.contentBlocks?.length, starter.contentBlocks.length);
    }
    const preset = getBookDesignPreset(template.presetId)!;
    const state = {
      theme: starter.theme,
      bindingDirection: starter.bindingDirection,
      writingMode: starter.writingMode,
      fontFamily: starter.themeSettings.fontFamily!,
      fontScale: starter.themeSettings.fontScale!,
      lineHeight: starter.themeSettings.lineHeight!,
      marginScale: starter.themeSettings.marginScale!,
      pageWidth: starter.themeSettings.pageWidth!,
      paragraphSpacing: starter.themeSettings.paragraphSpacing!,
      background: starter.themeSettings.background!,
      textColor: starter.themeSettings.textColor!,
      accentColor: starter.themeSettings.accentColor!,
      coverStyle: starter.themeSettings.coverStyle!,
      imageLayout: starter.themeSettings.imageLayout!,
      coverDesign: starter.coverDesign,
    };
    const applied = applyDesignSpecToState(state, { ...preset.spec, page: { ...preset.spec.page, writingMode: "horizontal-tb", bindingDirection: "ltr" } });
    assert.equal(applied.writingMode, "horizontal-tb");
    assert.deepEqual(starter.contentBlocks, reloaded.contentBlocks);
    assert.deepEqual(starter.publication, reloaded.publication);
    assert.equal(starter.bookId, reloaded.bookId);
  }
  assert.equal(JSON.stringify(template), before, "Catalog must stay unchanged");
  console.log(`${template.id}: sample ${pages.length} pages, images valid, 3 isolated starters, safe metadata PASS`);
}
const route = fs.readFileSync("src/app/api/templates/[id]/route.ts", "utf8");
assert.match(route, /requireAuthenticatedUser/);
assert.match(route, /getBookTemplate\(id\)/);
assert.match(route, /getBookCreationLimitForUser/);
assert.match(route, /status: 409/);
const create = fs.readFileSync("src/components/CreateTemplateBook.tsx", "utf8");
assert.match(create, /saveCanonicalBookCommand/);
assert.match(create, /assertBookCreationAvailable/);
assert.doesNotMatch(create, /saveDraft|saveAutosaveDraft|saveCanonicalPreview/);
console.log("Gate38 catalog, clone, identity, assets, pagination and save boundary verification PASS");
