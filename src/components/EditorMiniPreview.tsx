"use client";

import type { ReaderPage } from "@/lib/types";
import { useMemo } from "react";
import { INLINE_IMAGE_TOKEN_PREFIX, INLINE_YOUTUBE_TOKEN_PREFIX } from "@/lib/paginateText";
import { buildReaderFolioById, readerPageNumberLabel } from "@/lib/readerFolio";

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
      return page.chapterTitle;
    case "image":
      return page.caption || "画像ページ";
    case "youtube":
      return "YouTube動画";
    case "colophon":
      return "奥付";
    case "backCover":
      return "裏表紙";
    case "pageBreak":
      return "改ページ";
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
            {paragraph.startsWith("## ") ? paragraph.slice(3) : paragraph}
          </p>
        )
      ))}
      {!page.paragraphs.length ? <p className="is-empty">本文</p> : null}
    </div>
  );
}

export default function EditorMiniPreview({
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
  const logicalFolioById = useMemo(() => {
    const folioPages = logicalPages?.length ? logicalPages : pages.filter((page) => page.kind !== "pageBreak");
    return buildReaderFolioById(folioPages);
  }, [logicalPages, pages]);

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
      <div className="editor-mini-preview-list">
        {pages.map((page) => {
          const pageNumber = readerPageNumberLabel(page, logicalFolioById);
          const clickable = Boolean(onPageClick);
          return (
            <article
              className={`editor-mini-page ${activePageId === page.id ? "is-active" : ""} ${clickable ? "is-clickable" : ""}`}
              key={page.id}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-current={activePageId === page.id ? "page" : undefined}
              aria-label={clickable ? `${pageNumber || pageLabel(page)} ${pageLabel(page)}へ移動` : undefined}
              onClick={clickable ? () => onPageClick?.(page) : undefined}
              onKeyDown={clickable ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPageClick?.(page);
                }
              } : undefined}
            >
              <div className="editor-mini-page-number">{pageNumber || pageLabel(page)}</div>
              <div className="editor-mini-page-frame"><MiniPageContent page={page} /></div>
              <div className="editor-mini-page-meta"><span>{pageLabel(page)}</span></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
