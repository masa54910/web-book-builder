import { Fragment } from "react";
import type { SyntheticEvent } from "react";

import { INLINE_IMAGE_TOKEN_PREFIX, INLINE_YOUTUBE_TOKEN_PREFIX } from "@/lib/paginateText";
import type { PageAdjustment } from "@/lib/pageAdjustments";
import ReferenceBlock, { extractUrls } from "./ReferenceBlock";
import YouTubePage from "./YouTubePage";
import type { TextMark } from "@/lib/textStyles";
import { normalizeTextMarks, TEXT_FONT_SIZE_CSS } from "@/lib/textStyles";

function StyledParagraph({ text, marks }: { text: string; marks?: TextMark[] }) {
  const normalized = normalizeTextMarks(text, marks);
  if (!normalized.length) return <>{text}</>;
  const boundaries = new Set<number>([0, text.length]);
  normalized.forEach((mark) => { boundaries.add(mark.start); boundaries.add(mark.end); });
  const sorted = [...boundaries].sort((a, b) => a - b);
  return <>{sorted.slice(0, -1).map((start, index) => {
    const end = sorted[index + 1];
    if (end <= start) return null;
    const active = normalized.filter((mark) => mark.start <= start && mark.end >= end).pop();
    const content = text.slice(start, end);
    const styled = active?.color || active?.fontSize ? <span style={{ color: active.color, fontSize: active.fontSize ? TEXT_FONT_SIZE_CSS[active.fontSize] : undefined }}>{content}</span> : content;
    return active?.bold ? <strong key={`${start}-${end}`}>{styled}</strong> : <Fragment key={`${start}-${end}`}>{styled}</Fragment>;
  })}</>;
}

const PREVIOUS_GUIDE_PATTERN =
  /^(?:[・\-]\s*)?(前回|前回はこちら|前回まで|前回の記事|前回[〜～~↓]?|前回はこちら↓)$/;

function isPreviousGuide(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= 80 && PREVIOUS_GUIDE_PATTERN.test(normalized);
}

function stopPageFlip(event: SyntheticEvent) {
  event.stopPropagation();
}

function parseInlineImageToken(paragraph: string) {
  if (!paragraph.startsWith(INLINE_IMAGE_TOKEN_PREFIX) || !paragraph.endsWith("]]")) {
    return null;
  }
  const encoded = paragraph.slice(INLINE_IMAGE_TOKEN_PREFIX.length, -2);
  try {
    const decoded = JSON.parse(decodeURIComponent(encoded)) as {
      src?: string;
      alt?: string;
      caption?: string;
      missing?: boolean;
      displaySize?: "small" | "medium" | "large" | "full";
    };
    const displaySize: "small" | "medium" | "large" | "full" =
      decoded.displaySize === "small" || decoded.displaySize === "large" || decoded.displaySize === "full"
        ? decoded.displaySize
        : "medium";
    return {
      src: decoded.src,
      alt: decoded.alt || "inline image",
      caption: decoded.caption || "",
      missing: Boolean(decoded.missing),
      displaySize,
    };
  } catch {
    return null;
  }
}

function parseInlineYouTubeToken(paragraph: string) {
  if (!paragraph.startsWith(INLINE_YOUTUBE_TOKEN_PREFIX) || !paragraph.endsWith("]]")) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(paragraph.slice(INLINE_YOUTUBE_TOKEN_PREFIX.length, -2))) as {
      videoId?: string;
      displaySize?: "small" | "medium" | "large" | "full";
    };
    if (!decoded.videoId) return null;
    const displaySize: "small" | "medium" | "large" | "full" =
      decoded.displaySize === "small" || decoded.displaySize === "large" || decoded.displaySize === "full"
        ? decoded.displaySize
        : "medium";
    return {
      videoId: decoded.videoId,
      displaySize,
    };
  } catch {
    return null;
  }
}

export default function TextPage({
  bookTitle,
  chapterTitle,
  paragraphs,
  paragraphRuns,
  previousChapterTitle,
  onJumpToPrevious,
  adjustment,
}: {
  bookTitle: string;
  chapterTitle: string;
  paragraphs: string[];
  paragraphRuns?: TextMark[][];
  previousChapterTitle?: string;
  onJumpToPrevious?: () => void;
  adjustment?: PageAdjustment;
}) {
  return (
    <article className={`text-page text-page-spacing-${adjustment?.paragraphSpacing || "normal"}`}>
      <header className="text-page-header">
        <span>{bookTitle}</span>
        <span>{chapterTitle}</span>
      </header>
      {paragraphs.map((paragraph, index) => {
        const key = `${index}-${paragraph.slice(0, 18)}`;
        const inlineImage = parseInlineImageToken(paragraph);
        if (inlineImage) {
          return (
            <figure className={`text-inline-image media-display-size-${inlineImage.displaySize}`} key={`${key}-inline-image`}>
              {inlineImage.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inlineImage.src} alt={inlineImage.alt} loading="lazy" decoding="async" />
              ) : (
                <div className="text-inline-image-fallback">IMAGE</div>
              )}
              {inlineImage.caption.trim() ? <figcaption>{inlineImage.caption}</figcaption> : null}
              {inlineImage.missing ? <p className="text-inline-image-missing">画像IDが登録されていません。</p> : null}
            </figure>
          );
        }

        const inlineYouTube = parseInlineYouTubeToken(paragraph);
        if (inlineYouTube) {
          return (
            <div className={`text-inline-youtube media-display-size-${inlineYouTube.displaySize}`} key={`${key}-inline-youtube`}>
              <YouTubePage videoId={inlineYouTube.videoId} inline displaySize={inlineYouTube.displaySize} />
            </div>
          );
        }

        if (previousChapterTitle && onJumpToPrevious && isPreviousGuide(paragraph)) {
          return (
            <p className="text-paragraph" key={key}>
              <button
                type="button"
                className="inline-novel-link"
                aria-label={`${previousChapterTitle}へ戻る`}
                onPointerDown={stopPageFlip}
                onMouseDown={stopPageFlip}
                onTouchStart={stopPageFlip}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onJumpToPrevious();
                }}
              >
              <StyledParagraph text={paragraph} marks={paragraphRuns?.[index]} />
              </button>
            </p>
          );
        }

        const urls = extractUrls(paragraph);
        if (urls.length > 0) {
          const parts = paragraph.split(/(https?:\/\/[^\s　<>"'）】、。]+)/g);
          return (
            <Fragment key={key}>
              {parts.map((part, partIndex) =>
                urls.includes(part) ? (
                  <ReferenceBlock url={part} key={`${key}-url-${partIndex}`} />
                ) : part ? (
                  <p className="text-paragraph" key={`${key}-text-${partIndex}`}>
                    {part}
                  </p>
                ) : null,
              )}
            </Fragment>
          );
        }

        return (
          <p className="text-paragraph" key={key}>
            {paragraph.startsWith("## ") ? <StyledParagraph text={paragraph.slice(3)} marks={paragraphRuns?.[index]?.map((mark) => ({ ...mark, start: Math.max(0, mark.start - 3), end: Math.max(0, mark.end - 3) }))} /> : <StyledParagraph text={paragraph} marks={paragraphRuns?.[index]} />}
          </p>
        );
      })}
    </article>
  );
}
