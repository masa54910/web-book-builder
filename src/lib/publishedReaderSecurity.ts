import { contentBlocksToRawText, extractChaptersFromText, type BookContentBlock, type BookProject } from "@/lib/bookProject";

/**
 * Remove paid content before any reader payload or asset URL is materialized.
 * The paywall block itself is retained so the reader can render its boundary.
 */
export function filterPublishedProject(project: BookProject, paywallIndex: number, unlocked: boolean) {
  if (unlocked || paywallIndex < 0) return { blocks: project.contentBlocks || [], project };
  const blocks = (project.contentBlocks || []).slice(0, paywallIndex + 1);
  const rawText = contentBlocksToRawText(blocks);
  const chapters = extractChaptersFromText(rawText, project.config.title, blocks);
  return { blocks, project: restrictProjectToBlocks({ ...project, rawText, chapters }, blocks) };
}

export function visibleContentBlockIds(blocks: BookContentBlock[]) {
  return new Set(blocks.map((block) => block.id));
}

export function restrictProjectToBlocks(project: BookProject, blocks: BookContentBlock[]) {
  const visibleIds = visibleContentBlockIds(blocks);
  const visibleImageIds = new Set(
    blocks.filter((block) => block.type === "image").map((block) => block.id),
  );
  return {
    ...project,
    contentBlocks: blocks,
    images: project.images.filter((image) => visibleImageIds.has(image.image_id || image.image_index)),
    missingImageIds: project.missingImageIds.filter((id) => visibleImageIds.has(id)),
    config: {
      ...project.config,
      pageAdjustments: project.config.pageAdjustments?.filter((adjustment) => visibleIds.has(adjustment.blockId)),
    },
  };
}
