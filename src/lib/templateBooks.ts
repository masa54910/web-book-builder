import { buildBookProjectFromCanonicalPayload, type CanonicalBookPayload, type CanonicalContentBlock, type CanonicalAssetRef } from "@/lib/canonicalBook";
import { getBookDesignPreset } from "@/lib/designPresets";
import { normalizeCoverDesign } from "@/lib/coverDesign";
import { parseBookDesignSpec } from "@/lib/designSpec";
import { getBookTemplate } from "@/lib/templateCatalog";
import { parseGoogleMapsUrl } from "@/lib/googleMaps";

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
  const identity = () => `sample-${templateId}-${++sequence}`;
  const payload = createTemplatePayload(templateId, identity);
  payload.title = template.name;
  payload.authorName = "WebBookMaker";
  payload.slug = `sample-${template.id}`;
  payload.copyrightText = "Original sample text and artwork by WebBookMaker.";
  let sectionIndex = -1;
  payload.contentBlocks = payload.contentBlocks.map((block) => {
    if (block.type === "text" && block.structureRole === "chapter") sectionIndex += 1;
    return block.type === "text" && !block.structureRole ? { ...block, content: template.sections[sectionIndex].text } : block;
  });
  if (templateId === "teacher") {
    const lessonBlocks: CanonicalContentBlock[] = [
      { id: `chapter-teacher-practice-${identity()}`, type: "text", structureRole: "chapter", content: "授業で試す、十五分の観察" },
      { id: `text-teacher-practice-${identity()}`, type: "text", content: "二人組で同じ葉を観察し、見えたことを付せんに一つずつ書きます。まずは色や形など、目で確かめられる事実だけを集めましょう。次に付せんを似ているものどうしで並べ、どんな視点で分けたのかを話し合います。\n\n先生は答えを先に示さず、「そのことはどこで確かめた？」と問い返します。観察と言葉が少しずつ結びつく時間をつくることが、この活動のねらいです." },
      { id: `chapter-teacher-reflection-${identity()}`, type: "text", structureRole: "chapter", content: "学びを次の問いへ" },
      { id: `text-teacher-reflection-${identity()}`, type: "text", content: "最後に、今日気づいたことと、まだ確かめられていないことを一つずつ記録します。短い振り返りでも、次の授業で試したい方法が見えてきます。\n\nこの教材を使う人の年齢や時間に合わせて、問いの数や記録の形式を調整してください。小さな発見を持ち帰れることが、観察を続ける力になります." },
    ];
    payload.contentBlocks.splice(Math.max(2, payload.contentBlocks.length - 1), 0, ...lessonBlocks);
  }
  // Showcase features only in completed, app-owned samples. Starters remain
  // intentionally simple so users can replace their own content safely.
  const featureBlocks: CanonicalContentBlock[] = [];
  const addColumns = (id: string, left: string, right: string, ratio: "50-50" | "40-60" | "60-40" = "50-50") => {
    featureBlocks.push({ id, type: "columns", ratio, left: { blocks: [{ id: `${id}-left`, type: "text", content: left }] }, right: { blocks: [{ id: `${id}-right`, type: "text", content: right }] } });
  };
  const addYouTube = (id: string) => featureBlocks.push({ id, type: "youtube", videoId: "aqz-KE-bpKQ", originalUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", displayMode: "full-page", displaySize: "medium" });
  const addMap = (id: string) => {
    const map = parseGoogleMapsUrl("https://www.google.com/maps/@35.681236,139.767125,14z");
    if (map) featureBlocks.push({ id, type: "map", ...map, displayMode: "full-page", displaySize: "medium", alignment: "center" });
  };
  switch (templateId) {
    case "teacher": addColumns("feature-columns-teacher", "考え方を一つに絞ると、説明の順番が見えてきます。", "具体例を一つ添えると、学習者は自分の場面へ置き換えられます。", "40-60"); addYouTube("feature-video-teacher"); break;
    case "recipe": addColumns("feature-columns-recipe", "材料を先に計量し、火にかける前に並べておきます。", "香り・色・食感を確かめながら、最後の塩を少しずつ加えます。", "40-60"); addYouTube("feature-video-recipe"); addMap("feature-map-recipe"); break;
    case "blog": addColumns("feature-columns-blog", "記事の中で残したい一文を選びます。", "読者が次に試せる小さな行動へつなげます。"); addYouTube("feature-video-blog"); break;
    case "research": addColumns("feature-columns-research", "観察項目をそろえると、記録を比べられます。", "例外や迷いもメモに残すと、考察の手がかりになります。", "60-40"); addMap("feature-map-research"); break;
    case "photographer": addYouTube("feature-video-photographer"); addMap("feature-map-photographer"); break;
    case "magazine": addColumns("feature-columns-magazine", "編集部の視点で、街の細部を拾います。", "インタビューの声から、特集の輪郭を立ち上げます。", "40-60"); addYouTube("feature-video-magazine"); addMap("feature-map-magazine"); break;
    case "photo-book": addMap("feature-map-photo-book"); break;
  }
  payload.contentBlocks.splice(Math.max(2, payload.contentBlocks.length - 1), 0, ...featureBlocks);
  const build = buildBookProjectFromCanonicalPayload(payload);
  if (!build.ok) throw new Error(`Invalid catalog sample: ${Object.keys(build.errors).join(",")}`);
  return { ...build.project, config: { ...build.project.config, bookId: `app-sample-${templateId}`, bindingDirection: "ltr" as const, writingMode: "horizontal-tb" as const } };
}
