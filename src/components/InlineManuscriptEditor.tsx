"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  contentBlocksFromLegacy,
  createContentBlockId,
  ensureUniqueContentBlockIds,
  flattenContentBlocks,
  normalizeMediaDisplaySize,
  normalizePastedText,
  normalizeColumnsRatio,
  swapColumnsBlock,
  unwrapColumnsBlock,
  type BookColumnChildBlock,
  type BookColumnsBlock,
  type BookContentBlock,
  type ColumnsRatio,
  type MediaDisplayMode,
  type MediaDisplaySize,
} from "@/lib/bookProject";
import { isDisplayableImageUrl } from "@/lib/bookAssetStorage";
import { createPendingImageBlock, insertImageBlocksAtCursor, insertYouTubeBlockAtCursor } from "@/lib/inlineContentBlocks";
import { countContentCharacters, countUserCharacters } from "@/lib/characterCount";
import { parseYouTubeUrl, youtubeThumbnailUrl } from "@/lib/youtube";
import { applyTextMark, marksCoverRange, normalizeTextMarks, sliceTextMarks, TEXT_COLORS, TEXT_COLOR_LABELS, TEXT_FONT_SIZE_LABELS, type TextColor, type TextFontSize, type TextMark } from "@/lib/textStyles";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
}

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || 1200,
        height: image.naturalHeight || 800,
      });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve({ width: 1200, height: 800 });
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

function normalizeText(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function paragraphId() {
  return createContentBlockId("paragraph");
}

function parseStyledParagraph(paragraph: HTMLElement) {
  const marks: TextMark[] = [];
  let content = "";
  const walk = (node: Node, inherited: Partial<TextMark>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeText(node.textContent || "");
      const start = content.length;
      content += text;
      if (text && (inherited.bold || inherited.color || inherited.fontSize)) marks.push({ start, end: start + text.length, ...inherited });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const next: Partial<TextMark> = { ...inherited };
    const tag = node.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "br") {
      content += "\n";
      return;
    }
    const dataColor = node.dataset.textColor || node.style.color;
    if ((TEXT_COLORS as readonly string[]).includes(dataColor)) next.color = dataColor as TextColor;
    const size = node.dataset.fontSize;
    if (size === "small" || size === "normal" || size === "large") next.fontSize = size;
    node.childNodes.forEach((child) => walk(child, next));
  };
  paragraph.childNodes.forEach((child) => walk(child, {}));
  return { content, marks: normalizeTextMarks(content, marks) };
}

function renderStyledText(parent: HTMLElement, text: string, marks?: TextMark[]) {
  const normalized = normalizeTextMarks(text, marks);
  if (!normalized.length) { parent.textContent = text; return; }
  const boundaries = new Set<number>([0, text.length]);
  normalized.forEach((mark) => { boundaries.add(mark.start); boundaries.add(mark.end); });
  const sorted = [...boundaries].sort((a, b) => a - b);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) continue;
    const active = normalized.filter((mark) => mark.start <= start && mark.end >= end).pop();
    let node: Node = document.createTextNode(text.slice(start, end));
    if (active?.fontSize || active?.color) {
      const span = document.createElement("span");
      if (active.color) { span.style.color = active.color; span.dataset.textColor = active.color; }
      if (active.fontSize) span.dataset.fontSize = active.fontSize;
      span.append(node); node = span;
    }
    if (active?.bold) { const strong = document.createElement("strong"); strong.append(node); node = strong; }
    parent.append(node);
  }
}

function imageId() {
  return createContentBlockId("image");
}

function parseEditorDom(root: HTMLElement): BookContentBlock[] {
  const blocks: BookContentBlock[] = [];
  const children = Array.from(root.children);

  const parseColumnPane = (pane: HTMLElement): BookColumnChildBlock[] => {
    const parsed: BookColumnChildBlock[] = [];
    for (const [index, child] of Array.from(pane.children).entries()) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.dataset.columnAdd) continue;
      if (child.dataset.nodeType === "image") {
        const storagePath = child.dataset.storagePath || child.dataset.publicUrl || "";
        const uploadState = child.dataset.uploadState === "pending" || child.dataset.uploadState === "error" || child.dataset.uploadState === "ready"
          ? child.dataset.uploadState
          : undefined;
        if (!storagePath && uploadState !== "pending" && uploadState !== "error") continue;
        parsed.push({
          id: child.dataset.nodeId || imageId(),
          type: "image",
          storagePath,
          publicUrl: child.dataset.publicUrl || undefined,
          fileName: child.dataset.fileName || `column-image-${index + 1}`,
          mimeType: child.dataset.mimeType || "image/jpeg",
          width: Number(child.dataset.width || 1200),
          height: Number(child.dataset.height || 800),
          caption: child.dataset.caption || undefined,
          altText: child.dataset.altText || undefined,
          fitMode: child.dataset.fitMode === "cover" ? "cover" : "contain",
          pageMode: child.dataset.pageMode === "inline" ? "inline" : "full-page",
          displaySize: normalizeMediaDisplaySize(child.dataset.displaySize),
          uploadState,
          errorMessage: child.dataset.errorMessage || undefined,
        });
        continue;
      }
      if (child.dataset.nodeType === "youtube") {
        const videoId = child.dataset.videoId || "";
        if (!videoId) continue;
        parsed.push({
          id: child.dataset.nodeId || createContentBlockId("youtube"),
          type: "youtube",
          videoId,
          originalUrl: child.dataset.originalUrl || `https://www.youtube.com/watch?v=${videoId}`,
          displayMode: child.dataset.displayMode === "inline" ? "inline" : "full-page",
          displaySize: normalizeMediaDisplaySize(child.dataset.displaySize),
        });
        continue;
      }
      const styled = parseStyledParagraph(child);
      parsed.push({
        id: child.dataset.nodeId || paragraphId(),
        type: "text",
        content: styled.content,
        marks: styled.marks,
        structureRole: child.dataset.structureRole === "chapter" || child.dataset.structureRole === "subheading" ? child.dataset.structureRole : undefined,
      });
    }
    return parsed;
  };

  for (const [index, child] of children.entries()) {
    if (child instanceof HTMLElement && child.dataset.nodeType === "page-break") {
      continue;
    }
    if (child instanceof HTMLElement && child.dataset.nodeType === "image") {
      blocks.push({
        id: child.dataset.nodeId || imageId(),
        type: "image",
        storagePath: child.dataset.storagePath || "",
        publicUrl: child.dataset.publicUrl || undefined,
        fileName: child.dataset.fileName || `image-${index + 1}`,
        mimeType: child.dataset.mimeType || "image/jpeg",
        width: Number(child.dataset.width || 1200),
        height: Number(child.dataset.height || 800),
        caption: child.dataset.caption || undefined,
        altText: child.dataset.altText || undefined,
        fitMode: child.dataset.fitMode === "cover" ? "cover" : "contain",
        pageMode: child.dataset.pageMode === "inline" ? "inline" : "full-page",
        displaySize: normalizeMediaDisplaySize(child.dataset.displaySize),
        uploadState:
          child.dataset.uploadState === "pending" ||
          child.dataset.uploadState === "error" ||
          child.dataset.uploadState === "ready"
            ? child.dataset.uploadState
            : undefined,
        errorMessage: child.dataset.errorMessage || undefined,
      });
      continue;
    }
    if (child instanceof HTMLElement && child.dataset.nodeType === "youtube") {
      blocks.push({
        id: child.dataset.nodeId || createContentBlockId("youtube"),
        type: "youtube",
        videoId: child.dataset.videoId || "",
        originalUrl: child.dataset.originalUrl || "",
        displayMode: child.dataset.displayMode === "inline" ? "inline" : "full-page",
        displaySize: normalizeMediaDisplaySize(child.dataset.displaySize),
      });
      continue;
    }
    if (child instanceof HTMLElement && child.dataset.nodeType === "paywall") {
      blocks.push({ id: child.dataset.nodeId || createContentBlockId("paywall"), type: "paywall" });
      continue;
    }
    if (child instanceof HTMLElement && child.dataset.nodeType === "columns") {
      const left = child.querySelector<HTMLElement>("[data-column-side='left']");
      const right = child.querySelector<HTMLElement>("[data-column-side='right']");
      blocks.push({
        id: child.dataset.nodeId || createContentBlockId("columns"),
        type: "columns",
        ratio: normalizeColumnsRatio(child.dataset.ratio),
        left: { blocks: left ? parseColumnPane(left) : [] },
        right: { blocks: right ? parseColumnPane(right) : [] },
      });
      continue;
    }

    const styled = child instanceof HTMLElement ? parseStyledParagraph(child) : { content: normalizeText(child.textContent || ""), marks: [] };
    blocks.push({
      id: child instanceof HTMLElement && child.dataset.nodeId ? child.dataset.nodeId : paragraphId(),
      type: "text",
      content: styled.content,
      marks: styled.marks,
      structureRole:
        child instanceof HTMLElement && (child.dataset.structureRole === "chapter" || child.dataset.structureRole === "subheading")
          ? child.dataset.structureRole
          : undefined,
    });
  }

  if (!blocks.length) {
    blocks.push({ id: paragraphId(), type: "text", content: "" });
  }

  return ensureUniqueContentBlockIds(blocks);
}

function createParagraphElement(block: Extract<BookContentBlock, { type: "text" }>) {
  const paragraph = document.createElement("p");
  paragraph.dataset.nodeType = "paragraph";
  paragraph.dataset.nodeId = block.id;
  if (block.structureRole) paragraph.dataset.structureRole = block.structureRole;
  if (block.structureRole === "chapter") paragraph.classList.add("smart-format-chapter");
  if (block.structureRole === "subheading") paragraph.classList.add("smart-format-subheading");
  renderStyledText(paragraph, block.content || "", block.marks);
  if (!block.content) {
    paragraph.append(document.createElement("br"));
  }
  return paragraph;
}

function createImageElement(block: Extract<BookContentBlock, { type: "image" }>) {
  const wrapper = document.createElement("div");
  wrapper.dataset.nodeType = "image";
  wrapper.dataset.nodeId = block.id;
  wrapper.dataset.storagePath = block.storagePath || "";
  if (block.publicUrl) wrapper.dataset.publicUrl = block.publicUrl;
  wrapper.dataset.fileName = block.fileName;
  wrapper.dataset.mimeType = block.mimeType;
  wrapper.dataset.width = String(block.width);
  wrapper.dataset.height = String(block.height);
  wrapper.dataset.caption = block.caption || "";
  wrapper.dataset.altText = block.altText || "";
  wrapper.dataset.fitMode = block.fitMode;
  wrapper.dataset.pageMode = block.pageMode;
  wrapper.dataset.displaySize = normalizeMediaDisplaySize(block.displaySize);
  wrapper.dataset.uploadState = block.uploadState || "ready";
  if (block.errorMessage) wrapper.dataset.errorMessage = block.errorMessage;
  wrapper.contentEditable = "false";
  const editorDisplaySize = block.pageMode === "inline" ? normalizeMediaDisplaySize(block.displaySize) : "full";
  wrapper.className = [
    "inline-editor-image-node",
    block.uploadState === "pending" ? "is-pending" : "",
    block.uploadState === "error" ? "is-error" : "",
    block.fitMode === "cover" ? "fit-cover" : "fit-contain",
    `media-display-size-${editorDisplaySize}`,
  ]
    .filter(Boolean)
    .join(" ");

  const imageShell = document.createElement("div");
  imageShell.className = "inline-editor-image-shell";
  const displaySource = block.publicUrl || (isDisplayableImageUrl(block.storagePath) ? block.storagePath : "");
  if (displaySource) {
    const image = document.createElement("img");
    image.src = displaySource;
    image.alt = block.altText || block.fileName;
    image.loading = "lazy";
    image.decoding = "async";
    imageShell.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "inline-editor-image-placeholder";
    placeholder.textContent = block.uploadState === "error" ? "画像の読み込みに失敗しました" : "画像を読み込み中…";
    imageShell.append(placeholder);
  }

  const caption = document.createElement("p");
  caption.className = "inline-editor-image-caption";
  caption.textContent = block.caption || block.fileName;

  wrapper.append(imageShell, caption);
  return wrapper;
}

function createYouTubeElement(block: Extract<BookContentBlock, { type: "youtube" }>) {
  const wrapper = document.createElement("div");
  wrapper.dataset.nodeType = "youtube";
  wrapper.dataset.nodeId = block.id;
  wrapper.dataset.videoId = block.videoId;
  wrapper.dataset.originalUrl = block.originalUrl;
  wrapper.dataset.displayMode = block.displayMode === "inline" ? "inline" : "full-page";
  wrapper.dataset.displaySize = normalizeMediaDisplaySize(block.displaySize);
  wrapper.contentEditable = "false";
  const editorDisplaySize = block.displayMode === "inline" ? normalizeMediaDisplaySize(block.displaySize) : "full";
  wrapper.className = `inline-editor-youtube-node media-display-size-${editorDisplaySize}`;

  const thumbnail = document.createElement("img");
  thumbnail.src = youtubeThumbnailUrl(block.videoId);
  thumbnail.alt = "";
  thumbnail.loading = "lazy";
  thumbnail.decoding = "async";

  const label = document.createElement("span");
  label.className = "inline-editor-youtube-label";
  label.textContent = "▶ YouTube動画";
  wrapper.append(thumbnail, label);
  return wrapper;
}

function createPaywallElement(block: Extract<BookContentBlock, { type: "paywall" }>) {
  const wrapper = document.createElement("div");
  wrapper.dataset.nodeType = "paywall";
  wrapper.dataset.nodeId = block.id;
  wrapper.contentEditable = "false";
  wrapper.className = "inline-editor-paywall-node";
  wrapper.textContent = "🔒 ここから有料";
  return wrapper;
}

function createColumnsElement(block: BookColumnsBlock) {
  const wrapper = document.createElement("div");
  wrapper.dataset.nodeType = "columns";
  wrapper.dataset.nodeId = block.id;
  wrapper.dataset.ratio = block.ratio;
  wrapper.className = `inline-editor-columns inline-editor-columns-ratio-${block.ratio}`;
  wrapper.contentEditable = "false";

  const toolbar = document.createElement("div");
  toolbar.className = "inline-editor-columns-toolbar";
  const label = document.createElement("span");
  label.textContent = "2カラム";
  const ratio = document.createElement("select");
  ratio.dataset.columnAction = "ratio";
  ratio.dataset.columnId = block.id;
  ratio.setAttribute("aria-label", "カラム比率");
  for (const value of ["50-50", "40-60", "60-40"] as ColumnsRatio[]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === block.ratio;
    ratio.append(option);
  }
  const swap = document.createElement("button");
  swap.type = "button";
  swap.dataset.columnAction = "swap";
  swap.dataset.columnId = block.id;
  swap.textContent = "左右を入れ替え";
  const unwrap = document.createElement("button");
  unwrap.type = "button";
  unwrap.dataset.columnAction = "unwrap";
  unwrap.dataset.columnId = block.id;
  unwrap.textContent = "解除";
  toolbar.append(label, ratio, swap, unwrap);

  const panes = document.createElement("div");
  panes.className = "inline-editor-columns-panes";
  const createPane = (side: "left" | "right", children: BookColumnChildBlock[]) => {
    const pane = document.createElement("div");
    pane.dataset.columnSide = side;
    pane.className = `inline-editor-columns-pane inline-editor-columns-pane-${side}`;
    pane.contentEditable = "true";
    for (const child of children) {
      pane.append(child.type === "text" ? createParagraphElement(child) : child.type === "image" ? createImageElement(child) : createYouTubeElement(child));
    }
    if (!children.length) {
      const empty = createParagraphElement({ id: paragraphId(), type: "text", content: "" });
      pane.append(empty);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "inline-editor-column-add";
    add.dataset.columnAdd = side;
    add.dataset.columnId = block.id;
    add.contentEditable = "false";
    add.textContent = "＋ 内容を追加";
    pane.append(add);
    return pane;
  };
  panes.append(createPane("left", block.left.blocks), createPane("right", block.right.blocks));
  wrapper.append(toolbar, panes);
  return wrapper;
}

function renderNodes(root: HTMLElement, nodes: BookContentBlock[], pageBreakAfterBlockIds: string[] = []) {
  const fragment = document.createDocumentFragment();
  const breakIds = new Set(pageBreakAfterBlockIds);
  for (const block of nodes) {
    if (block.type === "text") {
      fragment.append(createParagraphElement(block));
    } else if (block.type === "image") {
      fragment.append(createImageElement(block));
    } else if (block.type === "youtube") {
      fragment.append(createYouTubeElement(block));
    } else if (block.type === "columns") {
      fragment.append(createColumnsElement(block));
    } else {
      fragment.append(createPaywallElement(block));
    }
    if (breakIds.has(block.id)) {
      const marker = document.createElement("div");
      marker.dataset.nodeType = "page-break";
      marker.dataset.afterBlockId = block.id;
      marker.className = "inline-editor-page-break-marker";
      marker.setAttribute("role", "button");
      marker.tabIndex = 0;
      marker.title = "クリックして改ページを解除";
      marker.textContent = "──────── 改ページ ────────";
      fragment.append(marker);
    }
  }
  root.replaceChildren(fragment);
}

function isImageFile(file: File) {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && [".jpg", ".jpeg", ".png", ".webp"].includes(extension);
}

function getSelectionRoot(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return { selection, range };
}

function cloneSelectionRange(root: HTMLElement) {
  const selectionInfo = getSelectionRoot(root);
  if (!selectionInfo) return null;
  return selectionInfo.range.cloneRange();
}

function getTextOffsetWithinParagraph(paragraph: HTMLElement, range: Range) {
  const workingRange = document.createRange();
  workingRange.selectNodeContents(paragraph);
  workingRange.setEnd(range.startContainer, range.startOffset);
  return workingRange.toString().length;
}

function splitParagraphAtCaret(paragraph: HTMLElement, range: Range) {
  const fullText = normalizeText(paragraph.textContent || "");
  const offset = Math.max(0, Math.min(fullText.length, getTextOffsetWithinParagraph(paragraph, range)));
  return {
    before: fullText.slice(0, offset),
    after: fullText.slice(offset),
  };
}

function setCaretAfterNode(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setCaretAtStartNode(node: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function findParagraphTarget(root: HTMLElement, range?: Range | null) {
  if (!range) return null;
  const start = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
  const paragraph = start?.closest?.("p[data-node-type='paragraph']") as HTMLElement | null;
  if (paragraph && root.contains(paragraph)) return paragraph;
  return null;
}

type ColumnParagraphTarget = {
  columnId: string;
  side: "left" | "right";
  childIndex: number;
  paragraph: HTMLElement;
};

function findColumnParagraphTarget(root: HTMLElement, paragraph: HTMLElement): ColumnParagraphTarget | null {
  const pane = paragraph.closest<HTMLElement>("[data-column-side]");
  const column = pane?.closest<HTMLElement>("[data-node-type='columns']");
  if (!pane || !column || !root.contains(column)) return null;
  const side = pane.dataset.columnSide;
  const columnId = column.dataset.nodeId;
  if ((side !== "left" && side !== "right") || !columnId) return null;
  const childIndex = Array.from(pane.children).indexOf(paragraph);
  return childIndex >= 0 ? { columnId, side, childIndex, paragraph } : null;
}

function updateColumnChild(
  blocks: BookContentBlock[],
  target: Pick<ColumnParagraphTarget, "columnId" | "side" | "childIndex">,
  update: (child: BookColumnChildBlock) => BookColumnChildBlock,
) {
  return blocks.map((block) => {
    if (block.type !== "columns" || block.id !== target.columnId) return block;
    const children = [...block[target.side].blocks];
    const child = children[target.childIndex];
    if (!child) return block;
    children[target.childIndex] = update(child);
    return { ...block, [target.side]: { blocks: children } } as BookColumnsBlock;
  });
}

type ColumnInsertTarget = {
  columnId: string;
  side: "left" | "right";
  childIndex: number;
};

function insertColumnChild(blocks: BookContentBlock[], target: ColumnInsertTarget, child: BookColumnChildBlock) {
  return blocks.map((block) => {
    if (block.type !== "columns" || block.id !== target.columnId) return block;
    const children = [...block[target.side].blocks];
    children.splice(Math.max(0, Math.min(target.childIndex, children.length)), 0, child);
    return { ...block, [target.side]: { blocks: children } } as BookColumnsBlock;
  });
}

function findContentBlockById(blocks: BookContentBlock[], nodeId: string): BookContentBlock | null {
  for (const block of blocks) {
    if (block.id === nodeId) return block;
    if (block.type === "columns") {
      const nested = findContentBlockById(block.left.blocks as BookContentBlock[], nodeId) || findContentBlockById(block.right.blocks as BookContentBlock[], nodeId);
      if (nested) return nested;
    }
  }
  return null;
}

function updateContentBlockById(blocks: BookContentBlock[], nodeId: string, patch: Partial<BookContentBlock>): BookContentBlock[] {
  return blocks.map((block) => {
    if (block.id === nodeId) return { ...block, ...patch } as BookContentBlock;
    if (block.type !== "columns") return block;
    return {
      ...block,
      left: { blocks: updateContentBlockById(block.left.blocks as BookContentBlock[], nodeId, patch) as BookColumnChildBlock[] },
      right: { blocks: updateContentBlockById(block.right.blocks as BookContentBlock[], nodeId, patch) as BookColumnChildBlock[] },
    };
  });
}

function removeContentBlockById(blocks: BookContentBlock[], nodeId: string): BookContentBlock[] {
  const next: BookContentBlock[] = [];
  for (const block of blocks) {
    if (block.id === nodeId) continue;
    if (block.type === "columns") {
      next.push({
        ...block,
        left: { blocks: removeContentBlockById(block.left.blocks as BookContentBlock[], nodeId) as BookColumnChildBlock[] },
        right: { blocks: removeContentBlockById(block.right.blocks as BookContentBlock[], nodeId) as BookColumnChildBlock[] },
      });
    } else next.push(block);
  }
  return next;
}

function setParagraphSelection(paragraph: HTMLElement, start: number, end: number) {
  const range = document.createRange();
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOffset = 0;
  let endOffset = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.textContent?.length || 0;
    if (!startNode && start <= cursor + length) { startNode = node; startOffset = Math.max(0, start - cursor); }
    if (end <= cursor + length) { endNode = node; endOffset = Math.max(0, end - cursor); break; }
    cursor += length;
  }
  if (!startNode || !endNode) return null;
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return range;
}

function editorBlockIndex(root: HTMLElement, target: HTMLElement) {
  let index = 0;
  for (const child of Array.from(root.children)) {
    if (child === target) return index;
    if ((child as HTMLElement).dataset.nodeType !== "page-break") index += 1;
  }
  return -1;
}

function getRangeFromPoint(root: HTMLElement, x?: number, y?: number) {
  if (typeof x !== "number" || typeof y !== "number") return null;
  const doc = root.ownerDocument;
  const anyDoc = doc as Document & {
    caretRangeFromPoint?: (clientX: number, clientY: number) => Range | null;
    caretPositionFromPoint?: (clientX: number, clientY: number) => { offsetNode: Node; offset: number } | null;
  };
  const caretRange = anyDoc.caretRangeFromPoint?.(x, y);
  if (caretRange && root.contains(caretRange.commonAncestorContainer)) return caretRange;
  const caretPosition = anyDoc.caretPositionFromPoint?.(x, y);
  if (caretPosition) {
    const range = doc.createRange();
    range.setStart(caretPosition.offsetNode, caretPosition.offset);
    range.collapse(true);
    if (root.contains(range.commonAncestorContainer)) return range;
  }
  return null;
}

type Props = {
  value: BookContentBlock[];
  revision: string;
  onChange: (next: BookContentBlock[]) => void;
  onStatus: (message: string) => void;
  onPendingChange: (count: number) => void;
  onCursorChange?: (position: number, blockId: string | null) => void;
  scrollRequest?: { blockId: string; nonce: number } | null;
  pageBreakAfterBlockIds?: string[];
  onInsertPageBreak?: (blockId: string) => void;
  onRemovePageBreak?: (blockId: string) => void;
  onInsertPaywall?: () => void;
  onRemovePaywall?: (blockId: string) => void;
  onInsertColumns?: () => void;
  onPasteAutoFormat?: (previousBlocks: BookContentBlock[]) => void;
};

export default function InlineManuscriptEditor({
  value,
  revision,
  onChange,
  onStatus,
  onPendingChange,
  onCursorChange,
  scrollRequest,
  pageBreakAfterBlockIds = [],
  onInsertPageBreak,
  onRemovePageBreak,
  onInsertPaywall,
  onRemovePaywall,
  onInsertColumns,
  onPasteAutoFormat,
}: Props) {
  const editorRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const columnInsertTargetRef = useRef<ColumnInsertTarget | null>(null);
  const nodesRef = useRef<BookContentBlock[]>(value);
  const renderedRevisionRef = useRef<string | null>(null);
  const renderedBreakSignatureRef = useRef("");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedYouTubeId, setSelectedYouTubeId] = useState<string | null>(null);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeDisplayMode, setYoutubeDisplayMode] = useState<MediaDisplayMode>("inline");
  const [youtubeDisplaySize, setYoutubeDisplaySize] = useState<MediaDisplaySize>("medium");
  const [youtubeError, setYoutubeError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [cursorFallbackMessage, setCursorFallbackMessage] = useState("");
  const [isInsertMenuOpen, setIsInsertMenuOpen] = useState(false);
  const [imagePopoverPosition, setImagePopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [youtubePopoverPosition, setYoutubePopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(null);
  const pageBreakSignature = pageBreakAfterBlockIds.join("|");

  const reportCursor = useCallback(() => {
    const root = rootRef.current;
    if (!root || !onCursorChange) return;
    const selectionInfo = getSelectionRoot(root);
    const total = countContentCharacters(nodesRef.current);
    if (!selectionInfo) {
      onCursorChange(0, null);
      return;
    }
    const { range } = selectionInfo;
    const target = range.startContainer instanceof HTMLElement
      ? range.startContainer.closest("[data-node-type]")
      : range.startContainer.parentElement?.closest("[data-node-type]");
    const targetId = target?.getAttribute("data-node-id") || null;
    let position = 0;
    for (const node of Array.from(root.children)) {
      if (node === target) {
        if (node instanceof HTMLElement && node.dataset.nodeType === "paragraph" && node.contains(range.startContainer)) {
          const paragraphRange = document.createRange();
          paragraphRange.selectNodeContents(node);
          paragraphRange.setEnd(range.startContainer, range.startOffset);
          position += countUserCharacters(paragraphRange.toString());
        }
        break;
      }
      if (node instanceof HTMLElement && node.dataset.nodeType === "paragraph") {
        position += countUserCharacters(node.textContent || "");
      }
    }
    onCursorChange(Math.max(0, Math.min(total, position)), targetId);
  }, [onCursorChange]);

  const captureSelectionRange = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const range = cloneSelectionRange(root);
    if (!range) return;
    savedRangeRef.current = range;
    const editor = editorRef.current;
    if (!editor || range.collapsed || !range.toString()) { setSelectionToolbar(null); return; }
    const rect = range.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    setSelectionToolbar({ top: Math.max(8, rect.bottom - editorRect.top + 8), left: Math.max(8, Math.min(rect.left - editorRect.left, editorRect.width - 290)) });
  }, []);

  const emitChange = useCallback((next: BookContentBlock[]) => {
    nodesRef.current = next;
    onChange(next);
    const nextPending = flattenContentBlocks(next).filter((block) => block.type === "image" && block.uploadState === "pending").length;
    onPendingChange(nextPending);
  }, [onChange, onPendingChange]);

  const handleColumnsAction = useCallback((id: string, action: "ratio" | "swap" | "unwrap", ratio?: ColumnsRatio) => {
    const index = nodesRef.current.findIndex((block) => block.id === id && block.type === "columns");
    if (index < 0) return;
    const current = nodesRef.current[index];
    if (current.type !== "columns") return;
    let next: BookContentBlock[];
    if (action === "unwrap") {
      next = [...nodesRef.current.slice(0, index), ...unwrapColumnsBlock(current), ...nodesRef.current.slice(index + 1)];
    } else {
      const updated = action === "swap"
        ? swapColumnsBlock(current)
        : { ...current, ratio: normalizeColumnsRatio(ratio) };
      next = [...nodesRef.current];
      next[index] = updated;
    }
    const normalized = ensureUniqueContentBlockIds(next);
    emitChange(normalized);
    const root = rootRef.current;
    if (root) renderNodes(root, normalized, pageBreakAfterBlockIds);
    onStatus(action === "unwrap" ? "2カラムを解除しました。" : action === "swap" ? "左右のカラムを入れ替えました。" : "カラム比率を変更しました。");
  }, [emitChange, onStatus, pageBreakAfterBlockIds]);

  const applyMarkToSelection = useCallback((patch: Partial<Pick<TextMark, "bold" | "color" | "fontSize">>) => {
    const root = rootRef.current;
    const range = savedRangeRef.current?.cloneRange();
    if (!root || !range || range.collapsed) return;
    const paragraph = findParagraphTarget(root, range);
    if (!paragraph) return;

    // Columns children are rendered inside their own pane rather than as
    // direct editor children. Resolve the selected paragraph back to its
    // canonical column/side/child before falling back to the top-level path.
    const nestedTarget = findColumnParagraphTarget(root, paragraph);
    if (nestedTarget) {
      const column = nodesRef.current.find((block): block is BookColumnsBlock =>
        block.type === "columns" && block.id === nestedTarget.columnId,
      );
      const child = column?.[nestedTarget.side].blocks[nestedTarget.childIndex];
      if (!child || child.type !== "text") return;

      const start = getTextOffsetWithinParagraph(paragraph, range);
      const endRange = range.cloneRange();
      endRange.collapse(false);
      const end = getTextOffsetWithinParagraph(paragraph, endRange);
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      const nextPatch = patch.bold === true
        ? { ...patch, bold: !marksCoverRange(child.marks, from, to, "bold") }
        : patch;
      const next = updateColumnChild(nodesRef.current, nestedTarget, (current) => (
        current.id === child.id && current.type === "text"
          ? { ...current, marks: applyTextMark(current.content, current.marks, from, to, nextPatch) }
          : current
      ));
      emitChange(next);
      renderNodes(root, next, pageBreakAfterBlockIds);
      const rendered = root.querySelector<HTMLElement>(
        `[data-node-type="columns"][data-node-id="${CSS.escape(nestedTarget.columnId)}"] [data-column-side="${nestedTarget.side}"] [data-node-id="${CSS.escape(child.id)}"]`,
      );
      if (rendered) {
        const restored = setParagraphSelection(rendered, from, to);
        savedRangeRef.current = restored?.cloneRange() || null;
      }
      captureSelectionRange();
      return;
    }

    const nodeIndex = editorBlockIndex(root, paragraph);
    const block = nodeIndex >= 0 ? nodesRef.current[nodeIndex] : undefined;
    if (!block || block.type !== "text") return;
    const start = getTextOffsetWithinParagraph(paragraph, range);
    const endRange = range.cloneRange();
    endRange.collapse(false);
    const end = getTextOffsetWithinParagraph(paragraph, endRange);
    const next = [...nodesRef.current];
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const nextPatch = patch.bold === true ? { ...patch, bold: !marksCoverRange(block.marks, from, to, "bold") } : patch;
    next[nodeIndex] = { ...block, marks: applyTextMark(block.content, block.marks, from, to, nextPatch) };
    emitChange(next);
    renderNodes(root, next, pageBreakAfterBlockIds);
    const rendered = root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(block.id)}"]`);
    if (rendered) {
      const restored = setParagraphSelection(rendered, Math.min(start, end), Math.max(start, end));
      savedRangeRef.current = restored?.cloneRange() || null;
    }
    captureSelectionRange();
  }, [captureSelectionRange, emitChange, pageBreakAfterBlockIds]);

  const pendingCount = useMemo(
    () => flattenContentBlocks(value).filter((block) => block.type === "image" && block.uploadState === "pending").length,
    [value],
  );

  const selectedImage = useMemo(
    () => selectedImageId ? findContentBlockById(value, selectedImageId) as Extract<BookContentBlock, { type: "image" }> | null : null,
    [selectedImageId, value],
  );
  const selectedYouTube = useMemo(
    () => selectedYouTubeId ? findContentBlockById(value, selectedYouTubeId) as Extract<BookContentBlock, { type: "youtube" }> | null : null,
    [selectedYouTubeId, value],
  );

  useEffect(() => {
    const nextNodes: BookContentBlock[] = value.length
      ? value
      : [{ id: paragraphId(), type: "text", content: "" }];
    nodesRef.current = nextNodes;
    if (
      renderedRevisionRef.current === revision &&
      renderedBreakSignatureRef.current === pageBreakSignature &&
      rootRef.current?.childElementCount
    ) {
      reportCursor();
      return;
    }
    if (rootRef.current) {
      renderNodes(rootRef.current, nextNodes, pageBreakAfterBlockIds);
    }
    renderedRevisionRef.current = revision;
    renderedBreakSignatureRef.current = pageBreakSignature;
    reportCursor();
  }, [pageBreakAfterBlockIds, pageBreakSignature, reportCursor, revision, value]);

  const updateNode = (nodeId: string, patch: Partial<BookContentBlock>) => {
    const next = updateContentBlockById(nodesRef.current, nodeId, patch);
    emitChange(next);
    if (rootRef.current) renderNodes(rootRef.current, next, pageBreakAfterBlockIds);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-node-type='image']");
    nodes.forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.nodeId === selectedImageId);
    });
  }, [selectedImageId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-node-type='youtube']");
    nodes.forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.nodeId === selectedYouTubeId);
    });
  }, [selectedYouTubeId]);

  useEffect(() => {
    const updatePopoverPosition = () => {
      const root = rootRef.current;
      const editor = editorRef.current;
      if (!root || !editor || !selectedImageId) {
        setImagePopoverPosition(null);
        return;
      }
      const image = root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(selectedImageId)}"]`);
      if (!image) {
        setImagePopoverPosition(null);
        return;
      }
      const editorRect = editor.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const popoverWidth = Math.min(340, Math.max(260, editorRect.width - 24));
      const left = Math.max(12, Math.min(imageRect.left - editorRect.left, editorRect.width - popoverWidth - 12));
      const top = Math.max(12, imageRect.bottom - editorRect.top + 8);
      setImagePopoverPosition({ top, left });
    };
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [selectedImageId, value]);

  useEffect(() => {
    const updatePopoverPosition = () => {
      const root = rootRef.current;
      const editor = editorRef.current;
      if (!root || !editor || !selectedYouTubeId) {
        setYoutubePopoverPosition(null);
        return;
      }
      const node = root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(selectedYouTubeId)}"]`);
      if (!node) return;
      const editorRect = editor.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const popoverWidth = Math.min(340, Math.max(260, editorRect.width - 24));
      setYoutubePopoverPosition({
        top: Math.max(12, nodeRect.bottom - editorRect.top + 8),
        left: Math.max(12, Math.min(nodeRect.left - editorRect.left, editorRect.width - popoverWidth - 12)),
      });
    };
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [selectedYouTubeId, value]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImageId(null);
        setSelectedYouTubeId(null);
        setIsYouTubeModalOpen(false);
        setIsInsertMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !scrollRequest) return;
    const target = Array.from(root.children).find(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.nodeId === scrollRequest.blockId,
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target.dataset.nodeType === "paragraph") {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedRangeRef.current = range.cloneRange();
      root.focus();
      reportCursor();
      return;
    }

    let position = 0;
    for (const node of nodesRef.current) {
      if (node.id === scrollRequest.blockId) break;
      if (node.type === "text") position += countUserCharacters(node.content);
    }
    root.focus();
    onCursorChange?.(position, scrollRequest.blockId);
  }, [onCursorChange, reportCursor, scrollRequest]);

  const removeNode = (nodeId: string) => {
    const remaining = removeContentBlockById(nodesRef.current, nodeId);
    const next = remaining.length ? remaining : [{ id: paragraphId(), type: "text" as const, content: "" }];
    emitChange(next);
    if (rootRef.current) renderNodes(rootRef.current, next, pageBreakAfterBlockIds);
    setSelectedImageId(null);
    setSelectedYouTubeId(null);
  };

  async function finishUpload(files: File[], pendingIds: string[]) {
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const pendingId = pendingIds[index];
        if (!file || !pendingId) continue;
        try {
          const [dataUrl, size] = await Promise.all([fileToDataUrl(file), readImageSize(file)]);
          updateNode(pendingId, {
            id: pendingId,
            type: "image",
            storagePath: dataUrl,
            fileName: file.name,
            mimeType: file.type,
            width: size.width,
            height: size.height,
            caption: "",
            altText: file.name,
            fitMode: "contain",
            pageMode: "inline",
            uploadState: "ready",
            errorMessage: undefined,
          });
        } catch (error) {
          updateNode(pendingId, {
            uploadState: "error",
            errorMessage: error instanceof Error ? error.message : "画像を読み込めませんでした。",
          });
        }
      }
    } finally {
      const nextPending = flattenContentBlocks(nodesRef.current).filter((block) => block.type === "image" && block.uploadState === "pending").length;
      onPendingChange(nextPending);
    }
  }

  async function insertFiles(files: File[], source: "paste" | "drop" | "picker", clientX?: number, clientY?: number) {
    const root = rootRef.current;
    if (!root) return;
    const dropRange = source === "drop" ? getRangeFromPoint(root, clientX, clientY) : null;
    const selectionRange = cloneSelectionRange(root);
    const activeRange = (dropRange ?? savedRangeRef.current ?? selectionRange)?.cloneRange() ?? null;
    const paragraphTarget = findParagraphTarget(root, activeRange);

    const columnTarget = columnInsertTargetRef.current;
    if (columnTarget) {
      columnInsertTargetRef.current = null;
      const pendingImages = files.map((file) =>
        createPendingImageBlock(`pending-${crypto.randomUUID()}`, file.name, file.type),
      );
      const nextBlocks = pendingImages.reduce(
        (current, image, index) => insertColumnChild(current, { ...columnTarget, childIndex: columnTarget.childIndex + index }, image),
        nodesRef.current,
      );
      emitChange(ensureUniqueContentBlockIds(nextBlocks));
      const rendered = nodesRef.current;
      if (rootRef.current) renderNodes(rootRef.current, rendered, pageBreakAfterBlockIds);
      if (pendingImages.length) setSelectedImageId(pendingImages[pendingImages.length - 1].id);
      await finishUpload(files, pendingImages.map((image) => image.id));
      return;
    }

    if (paragraphTarget && activeRange) {
      const nestedTarget = findColumnParagraphTarget(root, paragraphTarget);
      if (nestedTarget) {
        const column = nodesRef.current.find((block): block is BookColumnsBlock => block.type === "columns" && block.id === nestedTarget.columnId);
        const current = column?.[nestedTarget.side].blocks[nestedTarget.childIndex];
        if (current?.type === "text") {
          const split = splitParagraphAtCaret(paragraphTarget, activeRange);
          const pendingImages = files.map((file) => createPendingImageBlock(`pending-${crypto.randomUUID()}`, file.name, file.type));
          const replacement: BookColumnChildBlock[] = [];
          if (split.before) replacement.push({ ...current, content: split.before, marks: sliceTextMarks(current.marks, 0, split.before.length) });
          replacement.push(...pendingImages);
          if (split.after) replacement.push({ id: paragraphId(), type: "text", content: split.after, marks: sliceTextMarks(current.marks, split.before.length, current.content.length) });
          let nextBlocks = nodesRef.current.map((block) => {
            if (block.type !== "columns" || block.id !== nestedTarget.columnId) return block;
            const children = [...block[nestedTarget.side].blocks];
            children.splice(nestedTarget.childIndex, 1, ...replacement);
            return { ...block, [nestedTarget.side]: { blocks: children } } as BookColumnsBlock;
          });
          nextBlocks = ensureUniqueContentBlockIds(nextBlocks);
          emitChange(nextBlocks);
          renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
          if (pendingImages.length) setSelectedImageId(pendingImages[pendingImages.length - 1].id);
          await finishUpload(files, pendingImages.map((image) => image.id));
          return;
        }
      }
      const nodeIndex = editorBlockIndex(root, paragraphTarget);
      if (nodeIndex >= 0) {
        const currentParagraph = nodesRef.current[nodeIndex];
        if (currentParagraph?.type === "text") {
          const split = splitParagraphAtCaret(paragraphTarget, activeRange);
          const pendingImages = files.map((file) =>
            createPendingImageBlock(`pending-${crypto.randomUUID()}`, file.name, file.type),
          );
          const { nextBlocks, insertedImageIds: pendingIds } = insertImageBlocksAtCursor({
            blocks: nodesRef.current,
            paragraphIndex: nodeIndex,
            cursorOffset: split.before.length,
            imageBlocks: pendingImages,
          });
          emitChange(nextBlocks);
          if (rootRef.current) renderNodes(rootRef.current, nextBlocks, pageBreakAfterBlockIds);
          if (pendingIds.length) setSelectedImageId(pendingIds[pendingIds.length - 1] || null);
          const insertedNode = root.querySelector<HTMLElement>(`[data-node-id="${pendingIds[pendingIds.length - 1]}"]`);
          if (insertedNode) setCaretAfterNode(insertedNode);
          await finishUpload(files, pendingIds);
          return;
        }
      }
    }

    const message = "カーソル位置を取得できないため、本文中にカーソルを置いてから画像を挿入してください。";
    setCursorFallbackMessage(message);
    onStatus(message);
  }

  const insertPastedText = (rawText: string) => {
    const text = normalizePastedText(rawText);
    if (!text.trim()) return;
    const parsed = contentBlocksFromLegacy(text, []);
    const pastedBlocks: BookContentBlock[] = ensureUniqueContentBlockIds(
      parsed.flatMap((block): BookContentBlock[] => {
        if (block.type !== "text") return [block];
        const paragraphs = block.content.split(/\n{2,}/u).filter((content) => content.trim().length > 0);
        return paragraphs.length
          ? paragraphs.map((content) => ({ id: createContentBlockId("paragraph"), type: "text" as const, content }))
          : [{ ...block, id: createContentBlockId("paragraph") }];
      }),
    );
    if (!pastedBlocks.length) return;

    const root = rootRef.current;
    const activeRange = root ? (savedRangeRef.current ?? cloneSelectionRange(root))?.cloneRange() ?? null : null;
    const paragraphTarget = root ? findParagraphTarget(root, activeRange) : null;
    const columnTarget = root && paragraphTarget ? findColumnParagraphTarget(root, paragraphTarget) : null;
    let nextBlocks: BookContentBlock[];

    if (paragraphTarget && activeRange) {
      if (!root) return;
      const nodeIndex = editorBlockIndex(root as HTMLElement, paragraphTarget);
      const current = nodeIndex >= 0 ? nodesRef.current[nodeIndex] : undefined;
      if (columnTarget) {
        const column = nodesRef.current.find((block): block is BookColumnsBlock => block.type === "columns" && block.id === columnTarget.columnId);
        const columnChild = column?.[columnTarget.side].blocks[columnTarget.childIndex];
        if (columnChild?.type === "text") {
          const startRange = activeRange.cloneRange();
          const endRange = activeRange.cloneRange();
          startRange.collapse(true);
          endRange.collapse(false);
          const start = getTextOffsetWithinParagraph(paragraphTarget, startRange);
          const end = getTextOffsetWithinParagraph(paragraphTarget, endRange);
          const before = columnChild.content.slice(0, start);
          const after = columnChild.content.slice(end);
          const replacement: BookColumnChildBlock[] = [];
          if (before) replacement.push({ ...columnChild, content: before, marks: sliceTextMarks(columnChild.marks, 0, start) });
          replacement.push(...pastedBlocks.filter((block): block is Extract<BookContentBlock, { type: "text" }> => block.type === "text"));
          if (after) replacement.push({ id: createContentBlockId("paragraph"), type: "text", content: after, marks: sliceTextMarks(columnChild.marks, end, columnChild.content.length) });
          nextBlocks = updateColumnChild(nodesRef.current, columnTarget, () => replacement[0] || { ...columnChild, content: "" });
          if (replacement.length > 1) {
            nextBlocks = nextBlocks.map((block) => {
              if (block.type !== "columns" || block.id !== columnTarget.columnId) return block;
              const children = [...block[columnTarget.side].blocks];
              children.splice(columnTarget.childIndex, 1, ...replacement);
              return { ...block, [columnTarget.side]: { blocks: children } };
            });
          }
          onPasteAutoFormat?.(nodesRef.current);
          nextBlocks = ensureUniqueContentBlockIds(nextBlocks);
          emitChange(nextBlocks);
          renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
          const selector = `[data-node-type='columns'][data-node-id="${CSS.escape(columnTarget.columnId)}"] [data-column-side="${columnTarget.side}"] [data-node-id="${CSS.escape((replacement.at(-1) || columnChild).id)}"]`;
          const last = root.querySelector<HTMLElement>(selector);
          if (last) setCaretAtStartNode(last);
          onStatus("カラム内へテキストを貼り付けました。");
          return;
        }
      }
      if (current?.type === "text") {
        const startRange = activeRange.cloneRange();
        const endRange = activeRange.cloneRange();
        startRange.collapse(true);
        endRange.collapse(false);
        const start = getTextOffsetWithinParagraph(paragraphTarget, startRange);
        const end = getTextOffsetWithinParagraph(paragraphTarget, endRange);
        const before = current.content.slice(0, start);
        const after = current.content.slice(end);
        const replacement: BookContentBlock[] = [];
        if (before) replacement.push({ ...current, content: before, marks: sliceTextMarks(current.marks, 0, start) });
        replacement.push(...pastedBlocks);
        if (after) replacement.push({ id: createContentBlockId("paragraph"), type: "text", content: after, marks: sliceTextMarks(current.marks, end, current.content.length) });
        nextBlocks = [...nodesRef.current];
        nextBlocks.splice(nodeIndex, 1, ...replacement);
      } else {
        nextBlocks = [...nodesRef.current, ...pastedBlocks];
      }
    } else {
      nextBlocks = [...nodesRef.current, ...pastedBlocks];
    }

    onPasteAutoFormat?.(nodesRef.current);
    nextBlocks = ensureUniqueContentBlockIds(nextBlocks);
    emitChange(nextBlocks);
    if (root) {
      renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
      const last = root.lastElementChild;
      if (last) setCaretAfterNode(last);
    }
    onStatus("原稿を解析し、見出し・段落構造を更新しました");
  };

  const insertImageFromPicker = () => {
    fileInputRef.current?.click();
  };

  const openYouTubeModal = () => {
    setYoutubeUrl("");
    setYoutubeDisplayMode("inline");
    setYoutubeDisplaySize("medium");
    setYoutubeError("");
    setIsYouTubeModalOpen(true);
  };

  const saveYouTubeBlock = () => {
    const parsed = parseYouTubeUrl(youtubeUrl);
    if (!parsed) {
      setYoutubeError("有効なYouTube URLを入力してください。");
      return;
    }

    if (selectedYouTube) {
      updateNode(selectedYouTube.id, {
        type: "youtube",
        videoId: parsed.videoId,
        originalUrl: parsed.canonicalUrl,
        displayMode: youtubeDisplayMode,
        displaySize: youtubeDisplaySize,
      });
      setIsYouTubeModalOpen(false);
      return;
    }

    const root = rootRef.current;
    if (!root) return;
    const columnTarget = columnInsertTargetRef.current;
    if (columnTarget) {
      columnInsertTargetRef.current = null;
      const youtubeBlock = {
        id: createContentBlockId("youtube"),
        type: "youtube" as const,
        videoId: parsed.videoId,
        originalUrl: parsed.canonicalUrl,
        displayMode: youtubeDisplayMode,
        displaySize: youtubeDisplaySize,
      };
      const nextBlocks = insertColumnChild(nodesRef.current, columnTarget, youtubeBlock);
      emitChange(ensureUniqueContentBlockIds(nextBlocks));
      renderNodes(root, nodesRef.current, pageBreakAfterBlockIds);
      setSelectedYouTubeId(youtubeBlock.id);
      setIsYouTubeModalOpen(false);
      return;
    }
    const activeRange = (savedRangeRef.current ?? cloneSelectionRange(root))?.cloneRange() ?? null;
    const paragraphTarget = findParagraphTarget(root, activeRange);
    if (!paragraphTarget || !activeRange) {
      const message = "動画を入れる位置にカーソルを置いてください。";
      setYoutubeError(message);
      onStatus(message);
      return;
    }
    const nestedTarget = findColumnParagraphTarget(root, paragraphTarget);
    if (nestedTarget) {
      const column = nodesRef.current.find((block): block is BookColumnsBlock => block.type === "columns" && block.id === nestedTarget.columnId);
      const current = column?.[nestedTarget.side].blocks[nestedTarget.childIndex];
      if (!current || current.type !== "text") return;
      const split = splitParagraphAtCaret(paragraphTarget, activeRange);
      const replacement: BookColumnChildBlock[] = [];
      if (split.before) replacement.push({ ...current, content: split.before, marks: sliceTextMarks(current.marks, 0, split.before.length) });
      const youtubeBlock = {
        id: createContentBlockId("youtube"),
        type: "youtube" as const,
        videoId: parsed.videoId,
        originalUrl: parsed.canonicalUrl,
        displayMode: youtubeDisplayMode,
        displaySize: youtubeDisplaySize,
      };
      replacement.push(youtubeBlock);
      if (split.after) replacement.push({ id: paragraphId(), type: "text", content: split.after, marks: sliceTextMarks(current.marks, split.before.length, current.content.length) });
      const nextBlocks = ensureUniqueContentBlockIds(nodesRef.current.map((block) => {
        if (block.type !== "columns" || block.id !== nestedTarget.columnId) return block;
        const children = [...block[nestedTarget.side].blocks];
        children.splice(nestedTarget.childIndex, 1, ...replacement);
        return { ...block, [nestedTarget.side]: { blocks: children } } as BookColumnsBlock;
      }));
      emitChange(nextBlocks);
      renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
      setSelectedYouTubeId(youtubeBlock.id);
      setIsYouTubeModalOpen(false);
      return;
    }
    const nodeIndex = editorBlockIndex(root, paragraphTarget);
    const current = nodeIndex >= 0 ? nodesRef.current[nodeIndex] : undefined;
    if (!current || current.type !== "text") return;
    const split = splitParagraphAtCaret(paragraphTarget, activeRange);
    const youtubeBlock = {
      id: createContentBlockId("youtube"),
      type: "youtube" as const,
      videoId: parsed.videoId,
      originalUrl: parsed.canonicalUrl,
      displayMode: youtubeDisplayMode,
      displaySize: youtubeDisplaySize,
    };
    const nextBlocks = insertYouTubeBlockAtCursor({
      blocks: nodesRef.current,
      paragraphIndex: nodeIndex,
      cursorOffset: split.before.length,
      youtubeBlock,
    });
    emitChange(nextBlocks);
    renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
    setSelectedYouTubeId(youtubeBlock.id);
    setIsYouTubeModalOpen(false);
  };

  const insertPageBreakAtCursor = () => {
    const root = rootRef.current;
    if (!root) return;
    const activeRange = (savedRangeRef.current ?? cloneSelectionRange(root))?.cloneRange() ?? null;
    const paragraphTarget = findParagraphTarget(root, activeRange);
    if (!paragraphTarget || !activeRange) {
      const message = "改ページを入れる位置にカーソルを置いてください。";
      setCursorFallbackMessage(message);
      onStatus(message);
      return;
    }
    const nodeIndex = editorBlockIndex(root, paragraphTarget);
    const current = nodeIndex >= 0 ? nodesRef.current[nodeIndex] : undefined;
    if (!current || current.type !== "text") return;
    const split = splitParagraphAtCaret(paragraphTarget, activeRange);
    const before = { ...current, content: split.before, marks: sliceTextMarks(current.marks, 0, split.before.length) } as Extract<BookContentBlock, { type: "text" }>;
    const after = {
      id: `${current.id}-after-${crypto.randomUUID()}`,
      type: "text" as const,
      content: split.after,
      marks: sliceTextMarks(current.marks, split.before.length, current.content.length),
    };
    const nextBlocks = [...nodesRef.current];
    nextBlocks.splice(nodeIndex, 1, before, after);
    emitChange(nextBlocks);
    onInsertPageBreak?.(before.id);
    renderNodes(root, nextBlocks, pageBreakAfterBlockIds);
    const afterElement = root.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(after.id)}"]`);
    if (afterElement) {
      setCaretAtStartNode(afterElement);
      savedRangeRef.current = cloneSelectionRange(root);
    }
    reportCursor();
  };

  return (
    <section ref={editorRef} className={`inline-manuscript-editor ${dragOver ? "is-drag-over" : ""}`}>
      <div className="inline-manuscript-layout">
        <div className="inline-manuscript-floating-rail" aria-label="本文へ挿入">
          <button
            className={`inline-manuscript-floating-button inline-image-trigger ${isInsertMenuOpen ? "is-open" : ""}`}
            type="button"
            onMouseDown={(event) => {
              captureSelectionRange();
              event.preventDefault();
            }}
            onClick={() => {
              setCursorFallbackMessage("");
              setIsInsertMenuOpen((open) => !open);
            }}
            aria-label="本文へ挿入"
            title="本文へ挿入"
            aria-expanded={isInsertMenuOpen}
            aria-haspopup="menu"
          >
            <span aria-hidden="true">＋</span>
          </button>
          {isInsertMenuOpen ? (
            <div className="inline-manuscript-insert-menu" role="menu" aria-label="本文へ挿入する項目">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = columnInsertTargetRef.current;
                  setIsInsertMenuOpen(false);
                  if (!target) return;
                  columnInsertTargetRef.current = null;
                  const child = { id: paragraphId(), type: "text" as const, content: "" };
                  const next = ensureUniqueContentBlockIds(insertColumnChild(nodesRef.current, target, child));
                  emitChange(next);
                  if (rootRef.current) renderNodes(rootRef.current, next, pageBreakAfterBlockIds);
                  onStatus("カラム内へ文章を追加しました。");
                }}
              >
                文章を追加
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={(event) => {
                  captureSelectionRange();
                  event.preventDefault();
                }}
                onClick={() => {
                  setIsInsertMenuOpen(false);
                  insertImageFromPicker();
                }}
              >
                画像を追加
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={(event) => {
                  captureSelectionRange();
                  event.preventDefault();
                }}
                onClick={() => {
                  setIsInsertMenuOpen(false);
                  setSelectedYouTubeId(null);
                  openYouTubeModal();
                }}
              >
                YouTube動画を埋め込む
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={(event) => {
                  captureSelectionRange();
                  event.preventDefault();
                }}
                onClick={() => {
                  setIsInsertMenuOpen(false);
                  insertPageBreakAtCursor();
                }}
              >
                改ページを挿入
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={value.some((block) => block.type === "paywall")}
                onClick={() => {
                  setIsInsertMenuOpen(false);
                  onInsertPaywall?.();
                }}
              >
                🔒 ここから有料
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={(event) => {
                  captureSelectionRange();
                  event.preventDefault();
                }}
                onClick={() => {
                  setIsInsertMenuOpen(false);
                  onInsertColumns?.();
                }}
              >
                2カラムを挿入
              </button>
            </div>
          ) : null}
        </div>
        <div className="inline-manuscript-main">
          <div className="inline-manuscript-toolbar">
            {cursorFallbackMessage ? <span className="maker-note">{cursorFallbackMessage}</span> : null}
            {pendingCount ? <span className="maker-note">画像を読み込み中…</span> : null}
          </div>
          {selectionToolbar ? (
            <div className="inline-manuscript-selection-toolbar" style={{ top: selectionToolbar.top, left: selectionToolbar.left }} role="toolbar" aria-label="選択した本文の書式" onMouseDown={(event) => {
              // Keep the saved Range for toolbar buttons, but allow the native
              // select to receive its mousedown so the size menu can open.
              if (event.target instanceof HTMLSelectElement || (event.target as HTMLElement).closest("select")) return;
              event.preventDefault();
            }}>
              <button type="button" aria-label="太字" title="太字" onClick={() => applyMarkToSelection({ bold: true })}><strong>B</strong></button>
              <div className="inline-manuscript-color-tools" aria-label="文字色">
                <button type="button" aria-label="文字色を標準に戻す" title="標準色" onClick={() => applyMarkToSelection({ color: undefined })}>A</button>
                {TEXT_COLORS.map((color) => <button key={color} type="button" aria-label={`文字色（${TEXT_COLOR_LABELS[color]}）`} title={TEXT_COLOR_LABELS[color]} style={{ color }} onClick={() => applyMarkToSelection({ color })}>●</button>)}
              </div>
              <label className="inline-manuscript-font-size"><span>サイズ</span><select aria-label="文字サイズ" defaultValue="normal" onChange={(event) => applyMarkToSelection({ fontSize: event.target.value as TextFontSize })}>{Object.entries(TEXT_FONT_SIZE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          ) : null}
          <div
            ref={rootRef}
            className="inline-manuscript-surface"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="本文入力欄"
              onClick={(event) => {
              const target = event.target as HTMLElement;
              const columnAdd = target.closest("[data-column-add]") as HTMLElement | null;
              if (columnAdd) {
                const pane = columnAdd.closest<HTMLElement>("[data-column-side]");
                const column = columnAdd.closest<HTMLElement>("[data-node-type='columns']");
                const side = pane?.dataset.columnSide;
                const columnId = column?.dataset.nodeId;
                if ((side === "left" || side === "right") && columnId) {
                  const childIndex = pane ? Array.from(pane.children).filter((child) => !(child as HTMLElement).dataset.columnAdd).length : 0;
                  columnInsertTargetRef.current = { columnId, side, childIndex };
                  setIsInsertMenuOpen(true);
                }
                return;
              }
              const pageBreak = target.closest("[data-node-type='page-break']") as HTMLElement | null;
              if (pageBreak) {
                const blockId = pageBreak.dataset.afterBlockId;
                if (blockId) onRemovePageBreak?.(blockId);
                return;
              }
              const paywall = target.closest("[data-node-type='paywall']") as HTMLElement | null;
              if (paywall) {
                onRemovePaywall?.(paywall.dataset.nodeId || "");
                return;
              }
              const action = target.closest("[data-column-action]") as HTMLElement | null;
              if (action) {
                const id = action.dataset.columnId || "";
                if (id && action.dataset.columnAction !== "ratio") {
                  handleColumnsAction(id, action.dataset.columnAction as "swap" | "unwrap");
                }
                return;
              }
              const image = target.closest("[data-node-type='image']") as HTMLElement | null;
              const youtube = target.closest("[data-node-type='youtube']") as HTMLElement | null;
              setSelectedImageId(image?.dataset.nodeId || null);
              setSelectedYouTubeId(youtube?.dataset.nodeId || null);
              captureSelectionRange();
              reportCursor();
            }}
            onMouseUp={() => {
              captureSelectionRange();
              reportCursor();
            }}
            onKeyUp={() => {
              captureSelectionRange();
              reportCursor();
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b" && savedRangeRef.current && !savedRangeRef.current.collapsed) {
                event.preventDefault();
                applyMarkToSelection({ bold: true });
                return;
              }
              const target = event.target as HTMLElement;
              const pageBreak = target.closest("[data-node-type='page-break']") as HTMLElement | null;
              if (!pageBreak || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              const blockId = pageBreak.dataset.afterBlockId;
              if (blockId) onRemovePageBreak?.(blockId);
            }}
            onFocus={() => {
              captureSelectionRange();
              reportCursor();
            }}
            onInput={() => {
              const root = rootRef.current;
              if (!root) return;
              const next = parseEditorDom(root);
              nodesRef.current = next;
              onChange(next);
              const nextPending = flattenContentBlocks(next).filter((block) => block.type === "image" && block.uploadState === "pending").length;
              onPendingChange(nextPending);
              captureSelectionRange();
              reportCursor();
            }}
            onChange={(event) => {
              const target = event.target as HTMLElement;
              if (target instanceof HTMLSelectElement && target.dataset.columnAction === "ratio") {
                const id = target.dataset.columnId || "";
                if (id) handleColumnsAction(id, "ratio", target.value as ColumnsRatio);
              }
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files || []).filter(isImageFile);
              if (files.length) {
                event.preventDefault();
                void insertFiles(files, "paste");
                return;
              }
              const text = event.clipboardData.getData("text/plain");
              if (!text) return;
              event.preventDefault();
              insertPastedText(text);
            }}
            onDrop={(event) => {
              const files = Array.from(event.dataTransfer.files || []).filter(isImageFile);
              if (!files.length) return;
              event.preventDefault();
              setDragOver(false);
              void insertFiles(files, "drop", event.clientX, event.clientY);
            }}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types || []).includes("Files")) return;
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files || []).filter(isImageFile);
          if (!files.length) {
            event.currentTarget.value = "";
            return;
          }
          void insertFiles(files, "picker");
          event.currentTarget.value = "";
        }}
      />
      {selectedImage ? (
        <div
          className="inline-manuscript-popover"
          role="group"
          aria-label="画像設定"
          style={imagePopoverPosition ? { top: imagePopoverPosition.top, left: imagePopoverPosition.left } : undefined}
        >
          <label>
            <span>キャプション</span>
            <input
              value={selectedImage.caption || ""}
              onChange={(event) => updateNode(selectedImage.id, { caption: event.target.value })}
            />
          </label>
          <label>
            <span>代替テキスト</span>
            <input
              value={selectedImage.altText || ""}
              onChange={(event) => updateNode(selectedImage.id, { altText: event.target.value })}
            />
          </label>
          <label>
            <span>画像フィット</span>
            <select
              value={selectedImage.fitMode}
              onChange={(event) =>
                updateNode(selectedImage.id, { fitMode: event.target.value === "cover" ? "cover" : "contain" })
              }
            >
              <option value="contain">全体を表示</option>
              <option value="cover">枠いっぱいに表示</option>
            </select>
          </label>
          <fieldset className="inline-image-layout-fieldset">
            <legend>画像レイアウト</legend>
            <label>
              <input
                type="radio"
                name={`image-layout-${selectedImage.id}`}
                checked={selectedImage.pageMode === "inline"}
                onChange={() => updateNode(selectedImage.id, { pageMode: "inline" })}
              />
              <span>インライン</span>
            </label>
            <label>
              <input
                type="radio"
                name={`image-layout-${selectedImage.id}`}
                checked={selectedImage.pageMode === "full-page"}
                onChange={() => updateNode(selectedImage.id, { pageMode: "full-page" })}
              />
              <span>1ページ</span>
            </label>
          </fieldset>
          {selectedImage.pageMode === "inline" ? (
            <label>
              <span>表示サイズ</span>
              <select
                value={normalizeMediaDisplaySize(selectedImage.displaySize)}
                onChange={(event) => updateNode(selectedImage.id, { displaySize: normalizeMediaDisplaySize(event.target.value) })}
              >
                <option value="small">小（40%）</option>
                <option value="medium">中（60%）</option>
                <option value="large">大（80%）</option>
                <option value="full">最大（100%）</option>
              </select>
            </label>
          ) : null}
          <div className="inline-manuscript-popover-actions">
            <button className="maker-secondary-button" type="button" onClick={insertImageFromPicker}>
              差し替え
            </button>
            <button className="maker-secondary-button danger" type="button" onClick={() => removeNode(selectedImage.id)}>
              削除
            </button>
          </div>
        </div>
      ) : null}
      {selectedYouTube ? (
        <div
          className="inline-manuscript-popover"
          role="group"
          aria-label="YouTube動画設定"
          style={youtubePopoverPosition ? { top: youtubePopoverPosition.top, left: youtubePopoverPosition.left } : undefined}
        >
          <strong>YouTube動画</strong>
          <span className="maker-note">{selectedYouTube.originalUrl}</span>
          <fieldset className="inline-image-layout-fieldset">
            <legend>表示方法</legend>
            <label>
              <input type="radio" name={`youtube-layout-${selectedYouTube.id}`} checked={selectedYouTube.displayMode === "inline"} onChange={() => updateNode(selectedYouTube.id, { displayMode: "inline" })} />
              <span>本文内に表示</span>
            </label>
            <label>
              <input type="radio" name={`youtube-layout-${selectedYouTube.id}`} checked={selectedYouTube.displayMode !== "inline"} onChange={() => updateNode(selectedYouTube.id, { displayMode: "full-page" })} />
              <span>1ページに表示</span>
            </label>
          </fieldset>
          {selectedYouTube.displayMode === "inline" ? (
            <label>
              <span>表示サイズ</span>
              <select value={normalizeMediaDisplaySize(selectedYouTube.displaySize)} onChange={(event) => updateNode(selectedYouTube.id, { displaySize: normalizeMediaDisplaySize(event.target.value) })}>
                <option value="small">小（40%）</option>
                <option value="medium">中（60%）</option>
                <option value="large">大（80%）</option>
                <option value="full">最大（100%）</option>
              </select>
            </label>
          ) : null}
          <div className="inline-manuscript-popover-actions">
            <button
              className="maker-secondary-button"
              type="button"
              onClick={() => {
                setYoutubeUrl(selectedYouTube.originalUrl);
                setYoutubeDisplayMode(selectedYouTube.displayMode === "inline" ? "inline" : "full-page");
                setYoutubeDisplaySize(normalizeMediaDisplaySize(selectedYouTube.displaySize));
                setYoutubeError("");
                setIsYouTubeModalOpen(true);
              }}
            >
              URLを変更
            </button>
            <button className="maker-secondary-button danger" type="button" onClick={() => removeNode(selectedYouTube.id)}>
              動画を削除
            </button>
          </div>
        </div>
      ) : null}
      {isYouTubeModalOpen ? (
        <div className="youtube-url-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsYouTubeModalOpen(false);
        }}>
          <section className="youtube-url-modal" role="dialog" aria-modal="true" aria-labelledby="youtube-url-modal-title">
            <h2 id="youtube-url-modal-title">YouTube動画を埋め込む</h2>
            <p>YouTubeのURLを入力してください。</p>
            <label>
              <span>YouTube URL</span>
              <input
                autoFocus
                type="url"
                value={youtubeUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(event) => {
                  setYoutubeUrl(event.target.value);
                  setYoutubeError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveYouTubeBlock();
                  }
                }}
              />
            </label>
            <fieldset className="inline-image-layout-fieldset youtube-modal-settings">
              <legend>表示方法</legend>
              <label><input type="radio" name="youtube-modal-layout" checked={youtubeDisplayMode === "inline"} onChange={() => setYoutubeDisplayMode("inline")} /><span>本文内に表示</span></label>
              <label><input type="radio" name="youtube-modal-layout" checked={youtubeDisplayMode === "full-page"} onChange={() => setYoutubeDisplayMode("full-page")} /><span>1ページに表示</span></label>
            </fieldset>
            {youtubeDisplayMode === "inline" ? (
              <label>
                <span>表示サイズ</span>
                <select value={youtubeDisplaySize} onChange={(event) => setYoutubeDisplaySize(normalizeMediaDisplaySize(event.target.value))}>
                  <option value="small">小（40%）</option>
                  <option value="medium">中（60%）</option>
                  <option value="large">大（80%）</option>
                  <option value="full">最大（100%）</option>
                </select>
              </label>
            ) : null}
            {youtubeError ? <p className="youtube-url-error" role="alert">{youtubeError}</p> : null}
            <div className="youtube-url-modal-actions">
              <button className="maker-secondary-button" type="button" onClick={() => setIsYouTubeModalOpen(false)}>キャンセル</button>
              <button className="maker-primary-button" type="button" disabled={!youtubeUrl.trim()} onClick={saveYouTubeBlock}>追加する</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
