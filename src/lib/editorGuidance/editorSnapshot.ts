import { flattenContentBlocks, type BookContentBlock } from "@/lib/bookProject";
import { countUserCharacters } from "@/lib/characterCount";
import { findDocumentHeadings, type DocumentStructure } from "@/lib/documentStructure";
import type { ReaderPage } from "@/lib/types";
import type {
  EditorGuidanceEmptyHeading,
  EditorGuidancePageSnapshot,
  EditorGuidanceSnapshot,
} from "@/lib/editorGuidance/types";

export type BuildEditorGuidanceSnapshotInput = {
  title: string;
  contentBlocks: readonly BookContentBlock[];
  documentStructure: Readonly<DocumentStructure>;
  readerPages: readonly ReaderPage[];
  bodyCharacterCount: number;
  charactersPerPage: number;
};

function blockHasActualContent(block: BookContentBlock): boolean {
  if (block.type === "text") return Boolean(block.content.trim());
  if (block.type === "image") return true;
  if (block.type === "youtube") return Boolean(block.videoId);
  if (block.type === "paywall") return true;
  return [...block.left.blocks, ...block.right.blocks].some((child) =>
    blockHasActualContent(child as BookContentBlock),
  );
}

function pageTextCharacterCount(page: ReaderPage) {
  if (page.kind !== "text") return 0;
  return page.paragraphs.reduce(
    (total, paragraph) => total + countUserCharacters(paragraph),
    0,
  );
}

function substantivePage(page: ReaderPage) {
  return page.kind === "text"
    || page.kind === "image"
    || page.kind === "youtube"
    || page.kind === "columns";
}

function headingMetadata(blocks: readonly BookContentBlock[]) {
  let headingCount = 0;
  let explicitChapterCount = 0;
  const emptyHeadings: EditorGuidanceEmptyHeading[] = [];
  const flatBlocks = flattenContentBlocks([...blocks]);

  flatBlocks.forEach((block, documentOrder) => {
    if (block.type !== "text") return;
    const parsed = findDocumentHeadings(block.content);
    if (parsed.length) {
      headingCount += parsed.length;
      explicitChapterCount += parsed.filter((heading) => heading.level === 1).length;
    } else if (block.structureRole === "chapter" || block.structureRole === "subheading") {
      if (block.content.trim()) headingCount += 1;
      if (block.structureRole === "chapter" && block.content.trim()) explicitChapterCount += 1;
    }

    if (
      (block.structureRole === "chapter" || block.structureRole === "subheading")
        ? !block.content.trim()
        : block.content.split(/\r?\n/u).some((line) => /^\s*#{1,3}\s*$/u.test(line))
    ) {
      emptyHeadings.push({ sourceBlockId: block.id, documentOrder });
    }
  });

  return { headingCount, explicitChapterCount, emptyHeadings };
}

/**
 * Build a read-only, serializable projection for guidance rules. Reader pages
 * are supplied by the existing Mini Preview calculation; this function never
 * paginates, mutates editor state, or reads the contenteditable DOM.
 */
export function buildEditorGuidanceSnapshot(
  input: BuildEditorGuidanceSnapshotInput,
): EditorGuidanceSnapshot {
  const flatBlocks = flattenContentBlocks([...input.contentBlocks]);
  const hasActualContent = input.contentBlocks.some(blockHasActualContent);
  const materializedReaderPages = hasActualContent ? input.readerPages : [];
  const pages: EditorGuidancePageSnapshot[] = materializedReaderPages.map((page, pageIndex) => ({
    id: page.id,
    kind: page.kind,
    pageIndex,
    textCharacterCount: pageTextCharacterCount(page),
    sourceBlockIds: [...(page.sourceBlockIds || [])],
    substantive: substantivePage(page),
  }));
  const { headingCount, explicitChapterCount, emptyHeadings } = headingMetadata(input.contentBlocks);
  const paywallBlock = flatBlocks.find((block) => block.type === "paywall");
  const paywallPage = paywallBlock
    ? pages.find((page) => page.kind === "paywall" && page.sourceBlockIds.includes(paywallBlock.id))
      || pages.find((page) => page.kind === "paywall")
    : undefined;

  return {
    title: input.title,
    charactersPerPage: Math.max(180, Number(input.charactersPerPage) || 380),
    summary: {
      characterCount: Math.max(0, input.bodyCharacterCount),
      chapterCount: hasActualContent
        ? explicitChapterCount || input.documentStructure.chapters.length
        : 0,
      headingCount,
      pageCount: pages.length,
      imageCount: flatBlocks.filter((block) => block.type === "image").length,
      youtubeCount: flatBlocks.filter((block) => block.type === "youtube" && Boolean(block.videoId)).length,
      hasPaywall: Boolean(paywallBlock),
    },
    pages,
    emptyHeadings,
    paywall: paywallBlock
      ? {
          sourceBlockId: paywallBlock.id,
          readerPageId: paywallPage?.id,
          pageIndex: paywallPage?.pageIndex,
          substantivePagesBefore: paywallPage
            ? pages.slice(0, paywallPage.pageIndex).filter((page) => page.substantive).length
            : 0,
        }
      : undefined,
    pendingImageCount: flatBlocks.filter(
      (block) => block.type === "image" && block.uploadState === "pending",
    ).length,
  };
}
