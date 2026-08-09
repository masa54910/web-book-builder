"use client";

import HTMLFlipBook from "react-pageflip";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { BookConfig } from "@/config/bookConfig";
import { authorPagePath } from "@/lib/authorPage";
import { DEFAULT_COVER_DESIGN, normalizeCoverDesign, type CoverDesign } from "@/lib/coverDesign";
import {
  findPageAdjustment,
  normalizePageAdjustments,
  type PageAdjustment,
} from "@/lib/pageAdjustments";
import { buildReaderPages, toBoundPageOrder } from "@/lib/paginateText";
import { recordReaderProgress } from "@/lib/readerAnalytics";
import { buildReaderFolioById } from "@/lib/readerFolio";
import { themeClassNames } from "@/lib/themeSystem";
import type { BookContentBlock } from "@/lib/bookProject";
import {
  readLastRead,
  readStickyNotes,
  writeLastRead,
  writeStickyNotes,
} from "@/lib/readerStorage";
import type { LastRead, StickyNote } from "@/lib/readerStorage";
import type { ImageManifestRow, NovelChapter, ReaderPage } from "@/lib/types";
import BookPage from "./BookPage";
import ChapterTitlePage from "./ChapterTitlePage";
import CoverAdjustModal from "./CoverAdjustModal";
import ColophonPage from "./ColophonPage";
import ContentsPage from "./ContentsPage";
import CoverPage from "./CoverPage";
import ImagePage from "./ImagePage";
import ReaderControls from "./ReaderControls";
import ReadingTools from "./ReadingTools";
import ShareTools from "./ShareTools";
import TextPage from "./TextPage";
import TitlePage from "./TitlePage";
import HomeBackLink from "./HomeBackLink";

function getSafeLocalStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

type PageFlipApi = {
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  turnToPage: (page: number) => void;
  update: () => void;
};

type FlipBookHandle = {
  pageFlip: () => PageFlipApi;
};

function sourceBlockIdsForPage(page: ReaderPage) {
  const ids = page.sourceBlockIds?.filter(Boolean) || [];
  return ids.length ? ids : [page.id];
}

function primarySourceBlockId(page: ReaderPage) {
  return sourceBlockIdsForPage(page).find((id) => id !== page.id) || page.id;
}

/**
 * Prefer stable content-block adjustments, while still accepting the rendered
 * page ids used by older projects. The last source block is the natural target
 * when a rendered page contains more than one block.
 */
function adjustmentTargetIds(page: ReaderPage) {
  const ids = sourceBlockIdsForPage(page);
  const blockIds = ids.filter((id) => id !== page.id);
  return [...blockIds.reverse(), page.id];
}

function adjustmentForPage(adjustments: PageAdjustment[], page: ReaderPage | undefined) {
  if (!page) return undefined;
  for (const id of adjustmentTargetIds(page)) {
    const adjustment = findPageAdjustment(adjustments, id);
    if (adjustment) return adjustment;
  }
  return undefined;
}

export default function BookReader({
  config,
  chapters,
  images,
  contentBlocks,
  displayMode = "published",
  editHref,
  cloudBookId,
  shareUrl,
  shareDescription,
  shareDisabledReason,
  authorPageHandle,
  backLink,
  onCoverDesignChange,
}: {
  config: BookConfig;
  chapters: NovelChapter[];
  images: ImageManifestRow[];
  contentBlocks?: BookContentBlock[];
  displayMode?: "preview" | "published";
  editHref?: string;
  cloudBookId?: string;
  shareUrl?: string;
  shareDescription?: string;
  shareDisabledReason?: string;
  /** Canonical public profile handle for published-reader author links. */
  authorPageHandle?: string | null;
  backLink?: {
    destination?: "auto" | "home" | "dashboard";
    href?: string;
    label?: string;
  };
  onCoverDesignChange?: (patch: Partial<CoverDesign>) => void;
}) {
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const activePageIdRef = useRef<string | null>(null);
  const activePageSourceIdRef = useRef<string | null>(null);
  const storage = useMemo(() => getSafeLocalStorage(), []);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 760px)").matches,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() =>
    readStickyNotes(getSafeLocalStorage(), config.bookId),
  );
  const [resumePosition, setResumePosition] = useState<LastRead | null>(() =>
    readLastRead(getSafeLocalStorage(), config.bookId),
  );
  const [autoFlipEnabled, setAutoFlipEnabled] = useState(false);
  const [autoFlipSeconds, setAutoFlipSeconds] = useState(5);
  const [autoFlipLoop, setAutoFlipLoop] = useState(false);
  const [autoFlipStartMode, setAutoFlipStartMode] = useState<"cover" | "current">("current");
  const [isCoverDesignOpen, setIsCoverDesignOpen] = useState(false);
  const coverDesign = normalizeCoverDesign(config.coverDesign);
  const resolvedAuthorPageHandle =
    authorPageHandle === undefined ? config.authorProfile?.handle || "" : authorPageHandle || "";
  const pageAdjustments = useMemo(
    () => normalizePageAdjustments(config.pageAdjustments),
    [config.pageAdjustments],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setCurrentPage(0);
      setIsMobile(media.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const logicalPages = useMemo(
    () =>
      buildReaderPages({
        chapters,
        images,
        contentBlocks,
        pageAdjustments,
        charactersPerPage: isMobile
          ? Math.max(220, Math.floor(config.charactersPerPage * 0.82))
          : config.charactersPerPage,
        tableOfContentsItemsPerPage: config.tableOfContentsItemsPerPage,
      }),
    [chapters, config.charactersPerPage, config.tableOfContentsItemsPerPage, contentBlocks, images, isMobile, pageAdjustments],
  );
  const pages = useMemo(
    () => toBoundPageOrder(logicalPages, isMobile, config.bindingDirection),
    [config.bindingDirection, logicalPages, isMobile],
  );
  const logicalFolioById = useMemo(
    () => buildReaderFolioById(logicalPages),
    [logicalPages],
  );
  // Page breaks are applied by buildReaderPages so the next content starts on
  // the following page without rendering a synthetic blank page. Keep this
  // alias so reader controls and page rendering share the same canonical list.
  const pagesWithAdjustments = pages;

  const activePageIndex = Math.min(currentPage, Math.max(0, pagesWithAdjustments.length - 1));
  useEffect(() => {
    if (!activePageIdRef.current) {
      const activePage = pagesWithAdjustments[activePageIndex];
      activePageIdRef.current = activePage?.id || null;
      activePageSourceIdRef.current = activePage ? primarySourceBlockId(activePage) : null;
    }
  }, [activePageIndex, pagesWithAdjustments]);

  const pageDetails = useCallback(
    (pageIndex: number) => {
      const page = pagesWithAdjustments[pageIndex];
      if (!page) return null;
      const chapterTitle =
        "chapterTitle" in page
          ? page.chapterTitle
          : page.kind === "cover"
            ? "表紙"
            : page.kind === "title"
              ? "タイトルページ"
              : page.kind === "contents"
                ? "目次"
                : page.kind === "colophon"
                  ? "奥付"
                  : "裏表紙";
      const preview =
        page.kind === "text"
          ? page.paragraphs.join(" ").replace(/\s+/g, " ").trim().slice(0, 72)
          : page.kind === "image"
            ? page.caption || `本文画像 ${page.imageIndex}`
            : page.kind === "chapterTitle"
              ? "章扉"
              : chapterTitle;
      return {
        pageIndex,
        pageNumber: logicalFolioById.get(page.id) ?? pageIndex,
        pageId: page.id,
        chapterTitle,
        preview,
      };
    },
    [logicalFolioById, pagesWithAdjustments],
  );

  const saveLastReadAt = useCallback(
    (pageIndex: number) => {
      if (pageIndex <= 0) return;
      const details = pageDetails(pageIndex);
      if (!details) return;
      writeLastRead(storage, config.bookId, {
        pageIndex: details.pageIndex,
        pageNumber: details.pageNumber,
        pageId: details.pageId,
        chapterTitle: details.chapterTitle,
        savedAt: new Date().toISOString(),
      });
    },
    [config.bookId, pageDetails, storage],
  );

  const pageFlip = useCallback(() => flipBookRef.current?.pageFlip(), []);
  const goToPage = useCallback(
    (pageIndex: number) => {
      if (pageIndex < 0 || pageIndex >= pagesWithAdjustments.length) return;
      pageFlip()?.turnToPage(pageIndex);
      saveLastReadAt(pageIndex);
    },
    [pageFlip, pagesWithAdjustments.length, saveLastReadAt],
  );
  const jumpToId = useCallback(
    (id: string) => {
      const pageIndex = pagesWithAdjustments.findIndex((page) => page.id === id);
      if (pageIndex >= 0) goToPage(pageIndex);
    },
    [goToPage, pagesWithAdjustments],
  );
  const jumpToPrintedPage = useCallback(
    (pageNumber: number) => {
      const pageIndex = isMobile
        ? pageNumber
        : Math.max(1, pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber);
      goToPage(Math.min(pageIndex, pagesWithAdjustments.length - 2));
    },
    [goToPage, isMobile, pagesWithAdjustments.length],
  );

  const currentSpreadPageIds = useMemo(
    () =>
      new Set(
        [activePageIndex - 1, activePageIndex, activePageIndex + 1]
          .map((pageIndex) => pagesWithAdjustments[pageIndex]?.id)
          .filter((pageId): pageId is string => Boolean(pageId)),
      ),
    [activePageIndex, pagesWithAdjustments],
  );
  const hasBookmarkInCurrentSpread = useMemo(
    () => stickyNotes.some((note) => currentSpreadPageIds.has(note.pageId)),
    [currentSpreadPageIds, stickyNotes],
  );

  const toggleStickyNote = useCallback(() => {
    const details = pageDetails(activePageIndex);
    if (!details) return;
    setStickyNotes((current) => {
      const nearbyNote = current.find((note) => currentSpreadPageIds.has(note.pageId));
      const next = nearbyNote
        ? current.filter((note) => note.pageId !== nearbyNote.pageId)
        : [...current, details].sort((left, right) => left.pageNumber - right.pageNumber);
      writeStickyNotes(storage, config.bookId, next);
      return next;
    });
  }, [activePageIndex, config.bookId, currentSpreadPageIds, pageDetails, storage]);

  const removeStickyNote = useCallback(
    (note: StickyNote) => {
      setStickyNotes((current) => {
        const next = current.filter((item) => item.pageId !== note.pageId);
        writeStickyNotes(storage, config.bookId, next);
        return next;
      });
    },
    [config.bookId, storage],
  );

  const jumpToStickyNote = useCallback(
    (note: StickyNote) => {
      const stableIndex = pagesWithAdjustments.findIndex((page) => page.id === note.pageId);
      goToPage(stableIndex >= 0 ? stableIndex : Math.min(note.pageIndex, pagesWithAdjustments.length - 1));
    },
    [goToPage, pagesWithAdjustments],
  );

  const continueReading = useCallback(() => {
    if (!resumePosition) return;
    const stableIndex = pagesWithAdjustments.findIndex((page) => page.id === resumePosition.pageId);
    goToPage(
      stableIndex >= 0
        ? stableIndex
        : Math.min(Math.max(resumePosition.pageIndex, 0), pagesWithAdjustments.length - 1),
    );
    setResumePosition(null);
  }, [goToPage, pagesWithAdjustments, resumePosition]);

  const bookmarkedPageIds = useMemo(
    () => new Set(stickyNotes.map((note) => note.pageId)),
    [stickyNotes],
  );

  const readerStyle = useMemo(() => {
    const settings = config.themeSettings;
    const style: CSSProperties & Record<string, string | undefined> = {};
    if (settings?.textColor) style["--book-text-color"] = settings.textColor;
    if (settings?.accentColor) style["--book-accent-color"] = settings.accentColor;
    return style;
  }, [config.themeSettings]);

  const displayTitleLines = useMemo(
    () => config.displayTitleLines?.filter((line) => line.trim().length > 0),
    [config.displayTitleLines],
  );

  const toggleAutoFlip = useCallback(() => {
    setAutoFlipEnabled((enabled) => {
      const nextEnabled = !enabled;
      if (!enabled && autoFlipStartMode === "cover") goToPage(0);
      return nextEnabled;
    });
  }, [autoFlipStartMode, goToPage]);

  useEffect(() => {
    if (!autoFlipEnabled) return;
    const timer = window.setInterval(() => {
      if (activePageIndex >= pagesWithAdjustments.length - 1) {
        if (autoFlipLoop) {
          goToPage(0);
        } else {
          setAutoFlipEnabled(false);
        }
        return;
      }
      pageFlip()?.flipNext("top");
    }, Math.max(2, autoFlipSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [activePageIndex, autoFlipEnabled, autoFlipLoop, autoFlipSeconds, goToPage, pageFlip, pagesWithAdjustments.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && displayMode === "preview" && isCoverDesignOpen) {
        setIsCoverDesignOpen(false);
        return;
      }
      if (displayMode === "preview" && isCoverDesignOpen) return;
      const nextKey = config.bindingDirection === "rtl" ? "ArrowLeft" : "ArrowRight";
      const previousKey = config.bindingDirection === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (event.key === nextKey) {
        event.preventDefault();
        pageFlip()?.flipNext("top");
      } else if (event.key === previousKey) {
        event.preventDefault();
        pageFlip()?.flipPrev("top");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [config.bindingDirection, displayMode, isCoverDesignOpen, pageFlip]);

  useEffect(() => {
    if (displayMode !== "preview" || !isCoverDesignOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [displayMode, isCoverDesignOpen]);

  useEffect(() => {
    if (displayMode !== "preview") return;
    const activePageId = activePageIdRef.current;
    if (!activePageId) return;
    let targetIndex = pagesWithAdjustments.findIndex((page) => page.id === activePageId);
    if (targetIndex < 0 && activePageSourceIdRef.current) {
      targetIndex = pagesWithAdjustments.findIndex((page) =>
        sourceBlockIdsForPage(page).includes(activePageSourceIdRef.current as string),
      );
    }
    if (targetIndex < 0) return;
    const frame = window.requestAnimationFrame(() => {
      const api = pageFlip();
      if (!api) return;
      api.update();
      api.turnToPage(targetIndex);
      setCurrentPage(targetIndex);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [displayMode, pageFlip, pagesWithAdjustments]);

  const renderPage = (page: ReaderPage) => {
    let content: React.ReactNode;
    if (page.kind === "cover") content = <CoverPage config={config} />;
    else if (page.kind === "title") content = <TitlePage config={config} />;
    else if (page.kind === "contents") {
      content = (
        <ContentsPage
          chapters={chapters.slice(page.chapterStart, page.chapterEnd)}
          startIndex={page.chapterStart}
          part={page.part}
          totalParts={page.totalParts}
          onJump={(slug) => jumpToId(`chapter-${slug}`)}
        />
      );
    } else if (page.kind === "chapterTitle") {
      content = <ChapterTitlePage title={page.chapterTitle} order={page.chapterOrder} series={config.title} />;
    } else if (page.kind === "text") {
      const chapterIndex = chapters.findIndex((chapter) => chapter.title === page.chapterTitle);
      const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : undefined;
      content = (
        <TextPage
          bookTitle={config.title}
          chapterTitle={page.chapterTitle}
          paragraphs={page.paragraphs}
          previousChapterTitle={previousChapter?.title}
          onJumpToPrevious={
            previousChapter ? () => jumpToId(`chapter-${previousChapter.slug}`) : undefined
          }
          adjustment={adjustmentForPage(pageAdjustments, page)}
        />
      );
    } else if (page.kind === "image") {
      content = (
        <ImagePage
          src={page.src}
          alt={page.alt}
          caption={page.caption}
          missing={page.missing}
          adjustment={adjustmentForPage(pageAdjustments, page)}
        />
      );
    } else if (page.kind === "pageBreak") {
      content = <div className="page-break-page" aria-label="手動改ページ">ここから新しいページ</div>;
    } else if (page.kind === "colophon") content = <ColophonPage config={config} cloudBookId={cloudBookId} />;
    else content = <CoverPage config={config} back />;

    const hard = page.kind === "cover" || page.kind === "backCover";
    const logicalFolio = logicalFolioById.get(page.id) ?? 0;
    return (
      <BookPage
        key={page.id}
        label={page.kind === "text" || page.kind === "image" ? page.chapterTitle : page.kind}
        folio={hard ? undefined : logicalFolio}
        hard={hard}
        bookmarked={bookmarkedPageIds.has(page.id)}
      >
        {content}
      </BookPage>
    );
  };

  const directionLabel =
    config.bindingDirection === "rtl" ? "RIGHT-BOUND · 次へは左方向 ←" : "LEFT-BOUND · 次へは右方向 →";
  const helpText =
    config.bindingDirection === "rtl"
      ? "左矢印キーで次へ、右矢印キーで前へ。ページの角をドラッグ、またはタップしても移動できます。"
      : "右矢印キーで次へ、左矢印キーで前へ。ページの角をドラッグ、またはタップしても移動できます。";

  return (
    <main className={`reader-shell ${themeClassNames(config.theme, config.themeSettings)}`} style={readerStyle}>
      <header className="reader-masthead">
        <div>
          <p className="reader-kicker">Digital Book Builder · Static Preview</p>
          {displayTitleLines?.length ? (
            <h1 className="fixed-title-lines fixed-title-lines-masthead" aria-label={config.title}>
              {displayTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
          ) : (
            <h1>{config.title}</h1>
          )}
          {resolvedAuthorPageHandle ? (
            <a className="reader-author-link" href={authorPagePath(resolvedAuthorPageHandle)}>
              作者のページ
            </a>
          ) : null}
        </div>
        <div className="reader-masthead-actions">
          {displayMode === "preview" && backLink?.href ? (
            <Link className="reader-edit-link reader-preview-return" href={backLink.href}>
              {backLink.label || "← 戻る"}
            </Link>
          ) : null}
          {displayMode !== "preview" ? (backLink?.href ? (
            <Link
              className={`reader-edit-link ${displayMode === "published" ? "reader-author-return" : ""}`}
              href={backLink.href}
            >
              {backLink.label || "← 戻る"}
            </Link>
          ) : (
            <HomeBackLink
              className="reader-edit-link"
              destination={backLink?.destination}
              label={backLink?.label || "ホームへ戻る"}
            />
          )) : null}
          {displayMode !== "preview" && editHref ? (
            <a className="reader-edit-link" href={editHref}>
              編集画面へ戻る
            </a>
          ) : null}
          <span className="reader-direction">{directionLabel}</span>
        </div>
      </header>

      {displayMode === "preview" ? (
        <div className="reader-preview-tools" aria-label="Previewの編集">
          <button
            className={`reader-preview-action ${isCoverDesignOpen ? "is-active" : ""}`}
            type="button"
            aria-expanded={isCoverDesignOpen}
            aria-pressed={isCoverDesignOpen}
            onClick={() => {
              setIsCoverDesignOpen((open) => !open);
            }}
          >
            表紙を調整
          </button>
        </div>
      ) : null}

      <div className="reader-preview-layout">
        <section className="book-viewport" aria-label="デジタル書籍リーダー">
          <HTMLFlipBook
            key={`${isMobile ? "mobile" : "desktop"}-${pagesWithAdjustments.length}`}
            ref={flipBookRef}
            className="flip-book"
            style={{}}
            startPage={0}
            size="stretch"
            width={isMobile ? 340 : 430}
            height={isMobile ? 560 : 620}
            minWidth={280}
            maxWidth={470}
            minHeight={470}
            maxHeight={660}
            drawShadow
            flippingTime={780}
            usePortrait
            startZIndex={10}
            autoSize
            maxShadowOpacity={0.48}
            showCover
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            swipeDistance={24}
            showPageCorners
            disableFlipByClick={false}
            onFlip={(event: { data: number }) => {
              setCurrentPage(event.data);
              const activePage = pagesWithAdjustments[event.data];
              activePageIdRef.current = activePage?.id || null;
              activePageSourceIdRef.current = activePage ? primarySourceBlockId(activePage) : null;
              saveLastReadAt(event.data);
              recordReaderProgress(config.bookId, pagesWithAdjustments[event.data], event.data, pagesWithAdjustments.length, cloudBookId);
            }}
          >
            {pagesWithAdjustments.map(renderPage)}
          </HTMLFlipBook>
        </section>
      </div>

      {displayMode === "preview" && isCoverDesignOpen ? (
        <CoverAdjustModal
          config={config}
          value={coverDesign}
          onChange={(patch) => onCoverDesignChange?.(patch)}
          onReset={() => onCoverDesignChange?.({ ...DEFAULT_COVER_DESIGN })}
          onClose={() => setIsCoverDesignOpen(false)}
        />
      ) : null}

      <ReaderControls
        bindingDirection={config.bindingDirection}
        current={activePageIndex}
        total={pagesWithAdjustments.length}
        onFirst={() => pageFlip()?.turnToPage(0)}
        onContents={() => jumpToId("contents-1")}
        onPrevious={() => pageFlip()?.flipPrev("top")}
        onNext={() => pageFlip()?.flipNext("top")}
        onJumpToPage={jumpToPrintedPage}
      />
      <ReadingTools
        isBookmarked={hasBookmarkInCurrentSpread}
        stickyNotes={stickyNotes}
        resumePosition={resumePosition}
        autoFlipEnabled={autoFlipEnabled}
        autoFlipSeconds={autoFlipSeconds}
        autoFlipLoop={autoFlipLoop}
        autoFlipStartMode={autoFlipStartMode}
        onToggleBookmark={toggleStickyNote}
        onJumpToStickyNote={jumpToStickyNote}
        onRemoveStickyNote={removeStickyNote}
        onContinue={continueReading}
        onToggleAutoFlip={toggleAutoFlip}
        onAutoFlipSecondsChange={setAutoFlipSeconds}
        onAutoFlipLoopChange={setAutoFlipLoop}
        onAutoFlipStartModeChange={setAutoFlipStartMode}
      />
      {displayMode === "published" ? (
        <ShareTools
          bookId={config.bookId}
          cloudBookId={cloudBookId}
          title={config.title}
          author={config.author}
          description={shareDescription}
          shareUrl={shareUrl}
          shareDisabledReason={shareDisabledReason}
        />
      ) : null}
      <p className="reader-help">{helpText}</p>
    </main>
  );
}
