"use client";

import type { ReaderPage } from "@/lib/types";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { INLINE_IMAGE_TOKEN_PREFIX, INLINE_YOUTUBE_TOKEN_PREFIX } from "@/lib/paginateText";
import { buildReaderFolioById, readerPageNumberLabel } from "@/lib/readerFolio";
import { normalizeTextMarks, TEXT_FONT_SIZE_CSS, type TextMark } from "@/lib/textStyles";

function MiniStyledText({ text, marks }: { text: string; marks?: TextMark[] }) {
  const normalized = normalizeTextMarks(text, marks);
  if (!normalized.length) return <>{text}</>;
  const boundaries = new Set<number>([0, text.length]);
  normalized.forEach((mark) => { boundaries.add(mark.start); boundaries.add(mark.end); });
  const sorted = [...boundaries].sort((a, b) => a - b);
  return <>{sorted.slice(0, -1).map((start, index) => {
    const end = sorted[index + 1];
    const active = normalized.filter((mark) => mark.start <= start && mark.end >= end).pop();
    const textNode = <span style={{ color: active?.color, fontSize: active?.fontSize ? TEXT_FONT_SIZE_CSS[active.fontSize] : undefined }}>{text.slice(start, end)}</span>;
    return active?.bold ? <strong key={`${start}-${end}`}>{textNode}</strong> : <span key={`${start}-${end}`}>{textNode}</span>;
  })}</>;
}

function pageLabel(page: ReaderPage) {
  switch (page.kind) {
    case "cover":
      return "表紙";
    case "title":
      return "タイトル";
    case "contents":
      return "目次";
    case "chapterTitle":
      return page.chapterTitle;
    case "text":
      return page.sectionTitle || page.chapterTitle;
    case "image":
      return page.caption || "画像ページ";
    case "youtube":
      return "YouTube動画";
    case "columns":
      return "2カラム";
    case "colophon":
      return "奥付";
    case "backCover":
      return "裏表紙";
    case "pageBreak":
      return "改ページ";
    case "paywall":
      return "ここから有料";
    default:
      return "ページ";
  }
}

function isInlineImageToken(value: string) {
  return value.startsWith(INLINE_IMAGE_TOKEN_PREFIX) && value.endsWith("]]");
}

function isInlineYouTubeToken(value: string) {
  return value.startsWith(INLINE_YOUTUBE_TOKEN_PREFIX) && value.endsWith("]]");
}

function MiniImageMarker({ inline = false }: { inline?: boolean }) {
  return (
    <span className={`editor-mini-image-marker ${inline ? "is-inline" : ""}`} role="img" aria-label="画像">
      <span aria-hidden="true">▧</span>画像
    </span>
  );
}

function MiniPageContent({ page }: { page: ReaderPage }) {
  if (page.kind === "image") {
    return <div className="editor-mini-page-image"><MiniImageMarker /></div>;
  }
  if (page.kind === "youtube") {
    return <div className="editor-mini-page-youtube"><span aria-hidden="true">▶</span><strong>YouTube動画</strong></div>;
  }
  if (page.kind === "columns") {
    const columnsGrid = page.ratio === "40-60" ? "2fr 3fr" : page.ratio === "60-40" ? "3fr 2fr" : "1fr 1fr";
    const renderPane = (children: typeof page.left) => (
      <div className="editor-mini-columns-pane" style={{ display: "grid", minWidth: 0, overflow: "hidden" }}>
          {children.map((child) => child.kind === "text" ? (
            <p key={child.id}>
              {child.paragraphs.map((paragraph, index) => (
              <span key={`${child.id}-${index}`}>
                {index > 0 ? " " : ""}
                <MiniStyledText text={paragraph} marks={child.paragraphRuns?.[index]} />
              </span>
            ))}
          </p>
        ) : child.kind === "image" ? (
          <MiniImageMarker inline key={child.id} />
        ) : (
          <span className="editor-mini-inline-youtube" key={child.id}><span aria-hidden="true">▶</span></span>
        ))}
      </div>
    );
    return <div className="editor-mini-columns" data-columns-ratio={page.ratio} style={{ display: "grid", gridTemplateColumns: columnsGrid, minWidth: 0, overflow: "hidden" }}>{renderPane(page.left)}{renderPane(page.right)}</div>;
  }
  if (page.kind === "cover" || page.kind === "backCover") {
    return <div className="editor-mini-page-cover"><span>{page.kind === "cover" ? "WebBook" : ""}</span></div>;
  }
  if (page.kind === "chapterTitle") {
    return <div className="editor-mini-page-heading"><strong>{page.chapterTitle}</strong><i /><i /><i /></div>;
  }
  if (page.kind === "contents") {
    return <div className="editor-mini-page-lines"><strong>目次</strong><i /><i /><i /><i /></div>;
  }
  if (page.kind === "colophon" || page.kind === "pageBreak") {
    return <div className="editor-mini-page-lines"><strong>{page.kind === "colophon" ? "奥付" : "改ページ"}</strong><i /><i /></div>;
  }
  if (page.kind === "paywall") {
    return <div className="editor-mini-page-lines"><strong>🔒 ここから有料</strong><i /><i /></div>;
  }
  if (page.kind === "title") {
    return <div className="editor-mini-page-heading"><strong>タイトル</strong><i /><i /></div>;
  }

  return (
    <div className="editor-mini-page-text">
      {page.paragraphs.map((paragraph, index) => (
        isInlineImageToken(paragraph) ? (
          <MiniImageMarker inline key={`${page.id}-${index}`} />
        ) : isInlineYouTubeToken(paragraph) ? (
          <span className="editor-mini-inline-youtube" key={`${page.id}-${index}`}><span aria-hidden="true">▶</span> YouTube動画</span>
        ) : (
          <p className={paragraph.startsWith("## ") ? "is-heading" : ""} key={`${page.id}-${index}`}>
            {paragraph.startsWith("## ") ? <MiniStyledText text={paragraph.slice(3)} marks={page.paragraphRuns?.[index]} /> : <MiniStyledText text={paragraph} marks={page.paragraphRuns?.[index]} />}
          </p>
        )
      ))}
      {!page.paragraphs.length ? <p className="is-empty">本文</p> : null}
    </div>
  );
}

function EditorMiniPreview({
  pages,
  logicalPages,
  activePageId,
  onPageClick,
}: {
  pages: ReaderPage[];
  logicalPages?: ReaderPage[];
  activePageId?: string | null;
  onPageClick?: (page: ReaderPage) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [materializedIndices, setMaterializedIndices] = useState<Set<number>>(() => new Set());
  // Keep the complete ReaderPage[] as the source of truth, but materialize
  // only the thumbnail contents near the browser viewport. The lightweight
  // page cards remain present so scroll height, page labels, and click targets
  // stay stable while distant pages are replaced with placeholders.
  useEffect(() => {
    const initial = new Set<number>();
    for (let index = 0; index < Math.min(30, pages.length); index += 1) initial.add(index);
    const resetHandle = window.setTimeout(() => setMaterializedIndices(initial), 0);

    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return () => window.clearTimeout(resetHandle);
    const observer = new IntersectionObserver((entries) => {
      setMaterializedIndices((current) => {
        const next = new Set(current);
        let changed = false;
        entries.forEach((entry) => {
          const rawIndex = entry.target.getAttribute("data-mini-page-index");
          const index = rawIndex === null ? -1 : Number(rawIndex);
          if (index < 0 || !Number.isFinite(index)) return;
          if (entry.isIntersecting) {
            if (!next.has(index)) {
              next.add(index);
              changed = true;
            }
          } else if (next.has(index)) {
            next.delete(index);
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }, { rootMargin: "480px 0px" });
    list.querySelectorAll<HTMLElement>("[data-mini-page-index]").forEach((element) => observer.observe(element));
    return () => {
      window.clearTimeout(resetHandle);
      observer.disconnect();
    };
  }, [pages]);

  const logicalFolioById = useMemo(() => {
    const folioPages = logicalPages?.length ? logicalPages : pages.filter((page) => page.kind !== "pageBreak");
    return buildReaderFolioById(folioPages);
  }, [logicalPages, pages]);
  const activePageIndex = activePageId ? pages.findIndex((page) => page.id === activePageId) : -1;
  useEffect(() => {
    if (activePageIndex < 0) return;
    const activeIndex = activePageIndex;
    const handle = window.setTimeout(() => {
      setMaterializedIndices((current) => {
        if (current.has(activeIndex)) return current;
        const next = new Set(current);
        next.add(activeIndex);
        return next;
      });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [activePageIndex]);

  return (
    <section className="editor-mini-preview" aria-label="ページ一覧ミニプレビュー">
      <div className="editor-mini-preview-heading">
        <div>
          <p className="maker-kicker">Mini preview</p>
          <h2>ページ一覧</h2>
        </div>
        <strong>{pages.length}ページ</strong>
      </div>
      <p className="maker-note editor-mini-preview-note">本文の構成を確認できます。クリックするとそのページに移動できます。</p>
      <div ref={listRef} className="editor-mini-preview-list">
        {pages.map((page, index) => {
          const pageNumber = readerPageNumberLabel(page, logicalFolioById);
          const clickable = Boolean(onPageClick);
          const isMaterialized = materializedIndices.has(index);
          const handleClick = () => {
            if (!isMaterialized) {
              setMaterializedIndices((current) => {
                if (current.has(index)) return current;
                const next = new Set(current);
                next.add(index);
                return next;
              });
            }
            onPageClick?.(page);
          };
          return (
            <article
              className={`editor-mini-page ${activePageId === page.id ? "is-active" : ""} ${clickable ? "is-clickable" : ""}`}
              key={page.id}
              data-page-id={page.id}
              data-mini-page-index={index}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-current={activePageId === page.id ? "page" : undefined}
              aria-label={clickable ? `${pageNumber || pageLabel(page)} ${pageLabel(page)}へ移動` : undefined}
              onClick={clickable ? handleClick : undefined}
              onKeyDown={clickable ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleClick();
                }
              } : undefined}
            >
              <div className="editor-mini-page-number">{pageNumber || pageLabel(page)}</div>
              <div className="editor-mini-page-frame">
                {isMaterialized ? <MiniPageContent page={page} /> : <div className="editor-mini-page-placeholder" aria-hidden="true" />}
              </div>
              <div className="editor-mini-page-meta"><span>{pageLabel(page)}</span></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default memo(EditorMiniPreview);
