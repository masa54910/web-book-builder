import { buildBookProjectFromCanonicalPayload, type CanonicalBookPayload, type CanonicalContentBlock, type CanonicalAssetRef } from "@/lib/canonicalBook";
import { getBookDesignPreset } from "@/lib/designPresets";
import { normalizeCoverDesign } from "@/lib/coverDesign";
import { parseBookDesignSpec } from "@/lib/designSpec";
import { getBookTemplate } from "@/lib/templateCatalog";

/** Construct from a closed catalog, never spread a source user's BookProject. */
export function createTemplatePayload(templateId: unknown, identity = () => crypto.randomUUID()): CanonicalBookPayload {
  const template = getBookTemplate(templateId);
  if (!template) throw new Error("Unknown template ID");
  const draftIdentity = identity();
  const preset = getBookDesignPreset(template.presetId);
  if (!preset) throw new Error("Missing template preset");
  const checked = parseBookDesignSpec(preset.spec);
  if (!checked.success) throw new Error("Invalid template design");
  const spec = checked.data;
  const assets: CanonicalAssetRef[] = [];
  const contentBlocks: CanonicalContentBlock[] = [];
  template.sections.forEach((section, index) => {
    contentBlocks.push({ id: `chapter-${identity()}`, type: "text", structureRole: "chapter", content: section.title });
    contentBlocks.push({ id: `text-${identity()}`, type: "text", content: section.starter });
    if (section.image) {
      const assetId = `asset-${identity()}`;
      assets.push({ id: assetId, storagePath: `/sample-books/${template.id}/section-${index + 1}.webp`, fileName: `${template.id}-${index + 1}.webp`, mimeType: "image/webp", width: 1200, height: 900, altText: "差し替えて使えるオリジナル図版" });
      contentBlocks.push({ id: `image-${identity()}`, type: "image", assetId, pageMode: "full-page", displaySize: "large", fitMode: "contain" });
    }
  });
  return {
    // A non-persisted namespace: the existing save command allocates the DB Book ID.
    bookId: `template-draft-${draftIdentity}`,
    title: `${template.category}の新しい作品`, subtitle: "", authorName: "", description: template.description,
    publisherName: "", publishedAt: "", copyrightText: "", slug: `template-${template.id}-${draftIdentity.slice(0, 8)}`, language: "ja",
    theme: spec.theme, bindingDirection: "ltr", writingMode: "horizontal-tb", readerMode: "book",
    themeSettings: { ...spec.typography, ...spec.palette, background: spec.page.background, marginScale: spec.page.marginScale, pageWidth: spec.page.pageWidth, paragraphSpacing: spec.page.paragraphSpacing, coverStyle: spec.cover.coverStyle, imageLayout: spec.image.layout },
    coverDesign: normalizeCoverDesign({ ...spec.cover, titleTextOverride: undefined }),
    pageAdjustments: [], charactersPerPage: template.id === "picture-book" ? 220 : 380, tableOfContentsItemsPerPage: 6,
    contentBlocks, assets, coverAsset: { id: `cover-${identity()}`, storagePath: template.coverImage, fileName: "cover.webp", mimeType: "image/webp", width: 900, height: 1200 },
    externalLinks: [], authorHandle: "", authorBio: "", authorWebsiteUrl: "", authorXUrl: "", authorNoteUrl: "",
    externalSalesUrl: "", externalSalesLabel: "", publication: { status: "draft", visibility: "private" }, designHistory: [],
  };
}

/** Sample identities are stable and app-owned, separate from every starter identity. */
export function loadCatalogSample(templateId: string) {
  const template = getBookTemplate(templateId);
  if (!template) throw new Error("Unknown sample ID");
  let sequence = 0;
  const payload = createTemplatePayload(templateId, () => `sample-${templateId}-${++sequence}`);
  payload.title = template.name;
  payload.authorName = "WebBookMaker";
  payload.slug = `sample-${template.id}`;
  payload.copyrightText = "Original sample text and artwork by WebBookMaker.";
  let sectionIndex = -1;
  payload.contentBlocks = payload.contentBlocks.map((block) => {
    if (block.type === "text" && block.structureRole === "chapter") sectionIndex += 1;
    return block.type === "text" && !block.structureRole ? { ...block, content: template.sections[sectionIndex].text } : block;
  });
  const build = buildBookProjectFromCanonicalPayload(payload);
  if (!build.ok) throw new Error(`Invalid catalog sample: ${Object.keys(build.errors).join(",")}`);
  return { ...build.project, config: { ...build.project.config, bookId: `app-sample-${templateId}`, bindingDirection: "ltr" as const, writingMode: "horizontal-tb" as const } };
}
