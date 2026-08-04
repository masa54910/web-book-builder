import { Fragment } from "react";
import type { SyntheticEvent } from "react";

import { INLINE_IMAGE_TOKEN_PREFIX } from "@/lib/paginateText";
import ReferenceBlock, { extractUrls } from "./ReferenceBlock";

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
    };
    return {
      src: decoded.src,
      alt: decoded.alt || "inline image",
      caption: decoded.caption || "",
      missing: Boolean(decoded.missing),
    };
  } catch {
    return null;
  }
}

export default function TextPage({
  bookTitle,
  chapterTitle,
  paragraphs,
  previousChapterTitle,
  onJumpToPrevious,
}: {
  bookTitle: string;
  chapterTitle: string;
  paragraphs: string[];
  previousChapterTitle?: string;
  onJumpToPrevious?: () => void;
}) {
  return (
    <article className="text-page">
      <header className="text-page-header">
        <span>{bookTitle}</span>
        <span>{chapterTitle}</span>
      </header>
      {paragraphs.map((paragraph, index) => {
        const key = `${index}-${paragraph.slice(0, 18)}`;
        const inlineImage = parseInlineImageToken(paragraph);
        if (inlineImage) {
          return (
            <figure className="text-inline-image" key={`${key}-inline-image`}>
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
                {paragraph}
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
            {paragraph.startsWith("## ") ? paragraph.slice(3) : paragraph}
          </p>
        );
      })}
    </article>
  );
}
