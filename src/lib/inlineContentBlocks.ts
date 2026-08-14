import type { BookContentBlock } from "@/lib/bookProject";
import { sliceTextMarks } from "@/lib/textStyles";

type ImageBlock = Extract<BookContentBlock, { type: "image" }>;
type TextBlock = Extract<BookContentBlock, { type: "text" }>;
type YouTubeBlock = Extract<BookContentBlock, { type: "youtube" }>;

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
    displaySize: "medium",
    uploadState: "pending",
  };
}

function createTextBlock(id: string, content: string, marks?: TextBlock["marks"]): TextBlock {
  return {
    id,
    type: "text",
    content,
    marks,
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
    replacement.push(createTextBlock(target.id, beforeText, sliceTextMarks(target.marks, 0, boundedOffset)));
  }

  replacement.push(...imageBlocks);

  if (afterText.length > 0) {
    replacement.push(createTextBlock(`${target.id}-tail`, afterText, sliceTextMarks(target.marks, boundedOffset, target.content.length)));
  }

  next.splice(paragraphIndex, 1, ...replacement);

  return {
    nextBlocks: next,
    insertedImageIds: imageBlocks.map((block) => block.id),
  };
}

export function insertYouTubeBlockAtCursor({
  blocks,
  paragraphIndex,
  cursorOffset,
  youtubeBlock,
}: {
  blocks: BookContentBlock[];
  paragraphIndex: number;
  cursorOffset: number;
  youtubeBlock: YouTubeBlock;
}) {
  const next = [...blocks];
  const fallbackIndex = Math.min(Math.max(paragraphIndex, 0), next.length);
  const target = next[paragraphIndex];

  if (!target || target.type !== "text") {
    next.splice(fallbackIndex, 0, youtubeBlock);
    return next;
  }

  const boundedOffset = Math.max(0, Math.min(target.content.length, cursorOffset));
  const beforeText = target.content.slice(0, boundedOffset);
  const afterText = target.content.slice(boundedOffset);
  const replacement: BookContentBlock[] = [];

  if (beforeText.length > 0) replacement.push(createTextBlock(target.id, beforeText, sliceTextMarks(target.marks, 0, boundedOffset)));
  replacement.push(youtubeBlock);
  if (afterText.length > 0) replacement.push(createTextBlock(`${target.id}-tail`, afterText, sliceTextMarks(target.marks, boundedOffset, target.content.length)));
  next.splice(paragraphIndex, 1, ...replacement);
  return next;
}
