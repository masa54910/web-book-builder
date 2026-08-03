"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookContentBlock } from "@/lib/bookProject";
import { createPendingImageBlock, insertImageBlocksAtCursor } from "@/lib/inlineContentBlocks";

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
        pageMode: "full-page",
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
  wrapper.dataset.uploadState = block.uploadState || "ready";
  if (block.errorMessage) wrapper.dataset.errorMessage = block.errorMessage;
  wrapper.contentEditable = "false";
  wrapper.className = [
    "inline-editor-image-node",
    block.uploadState === "pending" ? "is-pending" : "",
    block.uploadState === "error" ? "is-error" : "",
    block.fitMode === "cover" ? "fit-cover" : "fit-contain",
  ]
    .filter(Boolean)
    .join(" ");

  const imageShell = document.createElement("div");
  imageShell.className = "inline-editor-image-shell";
  if (block.storagePath) {
    const image = document.createElement("img");
    image.src = block.storagePath;
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

function renderNodes(root: HTMLElement, nodes: BookContentBlock[]) {
  const fragment = document.createDocumentFragment();
  for (const block of nodes) {
    if (block.type === "text") {
      fragment.append(createParagraphElement(block));
    } else {
      fragment.append(createImageElement(block));
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

function findParagraphTarget(root: HTMLElement, range?: Range | null) {
  if (!range) {
    return root.querySelector<HTMLElement>("p[data-node-type='paragraph']") || null;
  }
  const start = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
  const paragraph = start?.closest?.("p[data-node-type='paragraph']") as HTMLElement | null;
  if (paragraph && root.contains(paragraph)) return paragraph;
  return null;
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
};

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1.7" fill="currentColor" />
      <path d="M6 17l4.2-4.2 2.8 2.6 2.2-2 2.8 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InlineManuscriptEditor({ value, revision, onChange, onStatus, onPendingChange }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const floatingButtonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<BookContentBlock[]>(value);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [insertPopoverStyle, setInsertPopoverStyle] = useState<CSSProperties>({});
  const [dragOver, setDragOver] = useState(false);
  const [cursorFallbackMessage, setCursorFallbackMessage] = useState("");

  const pendingCount = useMemo(
    () => value.filter((block) => block.type === "image" && block.uploadState === "pending").length,
    [value],
  );

  const selectedImage = useMemo(
    () => value.find((block): block is Extract<BookContentBlock, { type: "image" }> => block.type === "image" && block.id === selectedImageId) ?? null,
    [selectedImageId, value],
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
    if (rootRef.current) {
      renderNodes(rootRef.current, nextNodes);
    }
  }, [revision, value]);

  const updateNode = (nodeId: string, patch: Partial<BookContentBlock>) => {
    const next = nodesRef.current.map((node) => (node.id === nodeId ? { ...node, ...patch } as BookContentBlock : node));
    emitChange(next);
    if (rootRef.current) renderNodes(rootRef.current, next);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-node-type='image']");
    nodes.forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.nodeId === selectedImageId);
    });
  }, [selectedImageId]);

  const removeNode = (nodeId: string) => {
    const next = nodesRef.current.filter((node) => node.id !== nodeId);
    emitChange(next.length ? next : [{ id: paragraphId(0), type: "text", content: "" }]);
    if (rootRef.current) renderNodes(rootRef.current, next.length ? next : [{ id: paragraphId(0), type: "text", content: "" }]);
    setSelectedImageId(null);
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
            pageMode: "full-page",
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
    const selectionInfo = getSelectionRoot(root);
    const dropRange = source === "drop" ? getRangeFromPoint(root, clientX, clientY) : null;
    const activeRange = dropRange ?? selectionInfo?.range ?? null;
    const paragraphTarget = findParagraphTarget(root, activeRange);

    let insertionIndex = nodesRef.current.length;
    let beforeText = "";

    if (paragraphTarget && activeRange) {
      const nodeIndex = Array.from(root.children).indexOf(paragraphTarget);
      if (nodeIndex >= 0) {
        const split = splitParagraphAtCaret(paragraphTarget, activeRange);
        beforeText = split.before;
        insertionIndex = nodeIndex;
      }
    }

    if (!selectionInfo && source === "picker") {
      setCursorFallbackMessage("カーソル位置が取れなかったため、文末へ挿入しました。");
      onStatus("カーソル位置が取れなかったため、文末へ挿入しました。");
    } else {
      setCursorFallbackMessage("");
    }

    if (paragraphTarget && activeRange) {
      const nodeIndex = Array.from(root.children).indexOf(paragraphTarget);
      if (nodeIndex >= 0) {
        const currentParagraph = nodesRef.current[nodeIndex];
        if (currentParagraph?.type === "text") {
          const pendingImages = files.map((file) =>
            createPendingImageBlock(`pending-${crypto.randomUUID()}`, file.name, file.type),
          );
          const { nextBlocks, insertedImageIds: pendingIds } = insertImageBlocksAtCursor({
            blocks: nodesRef.current,
            paragraphIndex: nodeIndex,
            cursorOffset: beforeText.length,
            imageBlocks: pendingImages,
          });
          emitChange(nextBlocks);
          if (rootRef.current) renderNodes(rootRef.current, nextBlocks);
          if (pendingIds.length) setSelectedImageId(pendingIds[pendingIds.length - 1] || null);
          const insertedNode = root.querySelector<HTMLElement>(`[data-node-id="${pendingIds[pendingIds.length - 1]}"]`);
          if (insertedNode) setCaretAfterNode(insertedNode);
          await finishUpload(files, pendingIds);
          return;
        }
      }
    }

    const next = [...nodesRef.current];
    const insertionAt = Math.min(Math.max(insertionIndex, 0), next.length);
    const newNodes: BookContentBlock[] = files.map((file) =>
      createPendingImageBlock(`pending-${crypto.randomUUID()}`, file.name, file.type),
    );
    next.splice(insertionAt, 0, ...newNodes);
    emitChange(next);
    if (rootRef.current) renderNodes(rootRef.current, next);
    if (newNodes.length) setSelectedImageId(newNodes[newNodes.length - 1]?.id || null);
    const insertedNode = root.querySelector<HTMLElement>(`[data-node-id="${newNodes[newNodes.length - 1]?.id}"]`);
    if (insertedNode) setCaretAfterNode(insertedNode);
    await finishUpload(files, newNodes.map((node) => node.id));
    void clientX;
    void clientY;
  }

  const insertImageFromPicker = () => {
    fileInputRef.current?.click();
  };

  const updateInsertPopoverPosition = () => {
    const anchor = floatingButtonRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const spacing = 10;
    const reservedBottom = 88;
    const maxTop = Math.max(margin, viewportHeight - reservedBottom - popoverRect.height);
    const isMobile = viewportWidth <= 760;

    if (isMobile) {
      const width = Math.min(320, viewportWidth - margin * 2);
      let left = anchorRect.left + anchorRect.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, viewportWidth - margin - width));
      let top = anchorRect.bottom + spacing;
      if (top + popoverRect.height > viewportHeight - reservedBottom) {
        top = anchorRect.top - popoverRect.height - spacing;
      }
      top = Math.max(margin, Math.min(top, maxTop));

      setInsertPopoverStyle({
        position: "fixed",
        width,
        left,
        top,
      });
      return;
    }

    let left = anchorRect.right + spacing;
    if (left + popoverRect.width > viewportWidth - margin) {
      left = anchorRect.left - popoverRect.width - spacing;
    }
    left = Math.max(margin, Math.min(left, viewportWidth - margin - popoverRect.width));

    let top = anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2;
    top = Math.max(margin, Math.min(top, maxTop));

    setInsertPopoverStyle({
      position: "fixed",
      left,
      top,
      maxWidth: "min(360px, calc(100vw - 24px))",
    });
  };

  useEffect(() => {
    if (!isInsertModalOpen) return;
    const update = () => updateInsertPopoverPosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (floatingButtonRef.current?.contains(target)) return;
      setIsInsertModalOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInsertModalOpen(false);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isInsertModalOpen]);

  useEffect(() => {
    if (!isInsertModalOpen) return;
    updateInsertPopoverPosition();
  }, [isInsertModalOpen]);

  return (
    <section className={`inline-manuscript-editor ${dragOver ? "is-drag-over" : ""}`}>
      <div className="inline-manuscript-layout">
        <div className="inline-manuscript-floating-rail" aria-label="画像挿入">
          <button
            ref={floatingButtonRef}
            className="inline-manuscript-floating-button"
            type="button"
            onClick={() => setIsInsertModalOpen((current) => !current)}
            aria-label="画像を挿入"
          >
            <PhotoIcon />
          </button>
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
              const image = target.closest("[data-node-type='image']") as HTMLElement | null;
              setSelectedImageId(image?.dataset.nodeId || null);
            }}
            onInput={() => {
              const root = rootRef.current;
              if (!root) return;
              const next = parseEditorDom(root);
              nodesRef.current = next;
              onChange(next);
              const nextPending = next.filter((block) => block.type === "image" && block.uploadState === "pending").length;
              onPendingChange(nextPending);
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
      {isInsertModalOpen ? (
        <div
          ref={popoverRef}
          className="inline-manuscript-popover-panel"
          role="dialog"
          aria-modal="false"
          aria-label="画像を挿入"
          style={insertPopoverStyle}
        >
          <h3>画像を挿入</h3>
          <p>ドラッグ＆ドロップでも挿入できます。</p>
          <button
            className="maker-primary-button"
            type="button"
            onClick={() => {
              setIsInsertModalOpen(false);
              insertImageFromPicker();
            }}
          >
            画像を選択
          </button>
        </div>
      ) : null}
      {selectedImage ? (
        <div className="inline-manuscript-popover" role="group" aria-label="画像設定">
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
            <span>表示方法</span>
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
    </section>
  );
}
