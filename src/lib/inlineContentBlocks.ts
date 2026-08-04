import type { BookContentBlock } from "@/lib/bookProject";

type ImageBlock = Extract<BookContentBlock, { type: "image" }>;
type TextBlock = Extract<BookContentBlock, { type: "text" }>;

export function createPendingImageBlock(id: string, fileName: string, mimeType: string): ImageBlock {
  return {
    id,
    type: "image",
    storagePath: "",
    fileName,
    mimeType,
    width: 1200,
    height: 800,
    caption: "",
    altText: fileName,
    fitMode: "contain",
    pageMode: "inline",
    uploadState: "pending",
  };
}

function createTextBlock(id: string, content: string): TextBlock {
  return {
    id,
    type: "text",
    content,
  };
}

export function insertImageBlocksAtCursor({
  blocks,
  paragraphIndex,
  cursorOffset,
  imageBlocks,
}: {
  blocks: BookContentBlock[];
  paragraphIndex: number;
  cursorOffset: number;
  imageBlocks: ImageBlock[];
}) {
  if (!imageBlocks.length) {
    return {
      nextBlocks: blocks,
      insertedImageIds: [] as string[],
    };
  }

  const next = [...blocks];
  const fallbackIndex = Math.min(Math.max(paragraphIndex, 0), next.length);
  const target = next[paragraphIndex];

  if (!target || target.type !== "text") {
    next.splice(fallbackIndex, 0, ...imageBlocks);
    return {
      nextBlocks: next,
      insertedImageIds: imageBlocks.map((block) => block.id),
    };
  }

  const boundedOffset = Math.max(0, Math.min(target.content.length, cursorOffset));
  const beforeText = target.content.slice(0, boundedOffset);
  const afterText = target.content.slice(boundedOffset);
  const replacement: BookContentBlock[] = [];

  if (beforeText.length > 0) {
    replacement.push(createTextBlock(target.id, beforeText));
  }

  replacement.push(...imageBlocks);

  if (afterText.length > 0) {
    replacement.push(createTextBlock(`${target.id}-tail`, afterText));
  }

  next.splice(paragraphIndex, 1, ...replacement);

  return {
    nextBlocks: next,
    insertedImageIds: imageBlocks.map((block) => block.id),
  };
}