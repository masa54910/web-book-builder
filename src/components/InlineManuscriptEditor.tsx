"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { normalizeMediaDisplaySize, type BookContentBlock, type MediaDisplayMode, type MediaDisplaySize } from "@/lib/bookProject";
import { isDisplayableImageUrl } from "@/lib/bookAssetStorage";
import { createPendingImageBlock, insertImageBlocksAtCursor, insertYouTubeBlockAtCursor } from "@/lib/inlineContentBlocks";
import { countContentCharacters, countUserCharacters } from "@/lib/characterCount";
import { parseYouTubeUrl, youtubeThumbnailUrl } from "@/lib/youtube";

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

function paragraphId(index: number) {
  return `paragraph-${String(index + 1).padStart(3, "0")}`;
}

function imageId(index: number) {
  return `image-${String(index + 1).padStart(3, "0")}`;
}

function parseEditorDom(root: HTMLElement): BookContentBlock[] {
  const blocks: BookContentBlock[] = [];
  const children = Array.from(root.children);

  for (const [index, child] of children.entries()) {
    if (child instanceof HTMLElement && child.dataset.nodeType === "page-break") {
      continue;
    }
    if (child instanceof HTMLElement && child.dataset.nodeType === "image") {
      blocks.push({
        id: child.dataset.nodeId || imageId(index),
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
        id: child.dataset.nodeId || `youtube-${index + 1}`,
        type: "youtube",
        videoId: child.dataset.videoId || "",
        originalUrl: child.dataset.originalUrl || "",
        displayMode: child.dataset.displayMode === "inline" ? "inline" : "full-page",
        displaySize: normalizeMediaDisplaySize(child.dataset.displaySize),
      });
      continue;
    }

    const text = normalizeText(child.textContent || "");
    blocks.push({
      id: child instanceof HTMLElement && child.dataset.nodeId ? child.dataset.nodeId : paragraphId(index),
      type: "text",
      content: text,
    });
  }

  if (!blocks.length) {
    blocks.push({ id: paragraphId(0), type: "text", content: "" });
  }

  return blocks;
}

function createParagraphElement(block: Extract<BookContentBlock, { type: "text" }>) {
  const paragraph = document.createElement("p");
  paragraph.dataset.nodeType = "paragraph";
  paragraph.dataset.nodeId = block.id;
  paragraph.textContent = block.content || "";
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

function renderNodes(root: HTMLElement, nodes: BookContentBlock[], pageBreakAfterBlockIds: string[] = []) {
  const fragment = document.createDocumentFragment();
  const breakIds = new Set(pageBreakAfterBlockIds);
  for (const block of nodes) {
    if (block.type === "text") {
      fragment.append(createParagraphElement(block));
    } else if (block.type === "image") {
      fragment.append(createImageElement(block));
    } else {
      fragment.append(createYouTubeElement(block));
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
}: Props) {
  const editorRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
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
  }, []);

  const pendingCount = useMemo(
    () => value.filter((block) => block.type === "image" && block.uploadState === "pending").length,
    [value],
  );

  const selectedImage = useMemo(
    () => value.find((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.id === selectedImageId) ?? null,
    [selectedImageId, value],
  );
  const selectedYouTube = useMemo(
    () => value.find((block): block is Extract<BookContentBlock, { type: "youtube" }> => block.type === "youtube" && block.id === selectedYouTubeId) ?? null,
    [selectedYouTubeId, value],
  );

  const emitChange = (next: BookContentBlock[]) => {
    nodesRef.current = next;
    onChange(next);
    const nextPending = next.filter((block) => block.type === "image" && block.uploadState === "pending").length;
    onPendingChange(nextPending);
  };

  useEffect(() => {
    const nextNodes: BookContentBlock[] = value.length
      ? value
      : [{ id: paragraphId(0), type: "text", content: "" }];
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
    const next = nodesRef.current.map((node) => (node.id === nodeId ? { ...node, ...patch } as BookContentBlock : node));
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
    const next = nodesRef.current.filter((node) => node.id !== nodeId);
    emitChange(next.length ? next : [{ id: paragraphId(0), type: "text", content: "" }]);
    if (rootRef.current) {
      renderNodes(rootRef.current, next.length ? next : [{ id: paragraphId(0), type: "text", content: "" }], pageBreakAfterBlockIds);
    }
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
      const nextPending = nodesRef.current.filter((block) => block.type === "image" && block.uploadState === "pending").length;
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

    if (paragraphTarget && activeRange) {
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
    const activeRange = (savedRangeRef.current ?? cloneSelectionRange(root))?.cloneRange() ?? null;
    const paragraphTarget = findParagraphTarget(root, activeRange);
    if (!paragraphTarget || !activeRange) {
      const message = "動画を入れる位置にカーソルを置いてください。";
      setYoutubeError(message);
      onStatus(message);
      return;
    }
    const nodeIndex = editorBlockIndex(root, paragraphTarget);
    const current = nodeIndex >= 0 ? nodesRef.current[nodeIndex] : undefined;
    if (!current || current.type !== "text") return;
    const split = splitParagraphAtCaret(paragraphTarget, activeRange);
    const youtubeBlock = {
      id: `youtube-${crypto.randomUUID()}`,
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
    const before = { ...current, content: split.before } as Extract<BookContentBlock, { type: "text" }>;
    const after = {
      id: `${current.id}-after-${crypto.randomUUID()}`,
      type: "text" as const,
      content: split.after,
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
            </div>
          ) : null}
        </div>
        <div className="inline-manuscript-main">
          <div className="inline-manuscript-toolbar">
            {cursorFallbackMessage ? <span className="maker-note">{cursorFallbackMessage}</span> : null}
            {pendingCount ? <span className="maker-note">画像を読み込み中…</span> : null}
          </div>
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
              const pageBreak = target.closest("[data-node-type='page-break']") as HTMLElement | null;
              if (pageBreak) {
                const blockId = pageBreak.dataset.afterBlockId;
                if (blockId) onRemovePageBreak?.(blockId);
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
              const nextPending = next.filter((block) => block.type === "image" && block.uploadState === "pending").length;
              onPendingChange(nextPending);
              captureSelectionRange();
              reportCursor();
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files || []).filter(isImageFile);
              if (!files.length) return;
              event.preventDefault();
              void insertFiles(files, "paste");
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
