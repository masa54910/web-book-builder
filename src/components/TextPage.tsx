import { Fragment } from "react";
import type { SyntheticEvent } from "react";

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
