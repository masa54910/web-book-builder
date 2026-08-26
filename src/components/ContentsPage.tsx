import type { DocumentTocEntry } from "@/lib/documentStructure";

export default function ContentsPage({
  bookTitle,
  entries,
  startIndex,
  part,
  totalParts,
  onJump,
}: {
  bookTitle: string;
  entries: DocumentTocEntry[];
  startIndex: number;
  part: number;
  totalParts: number;
  onJump: (headingId: string) => void;
}) {
  return (
    <div className="contents-page">
      <p className="contents-book-title">{bookTitle}</p>
      <p className="editorial-label">Complete Edition · {part}/{totalParts}</p>
      <h2>CONTENTS</h2>
      <div className="contents-list">
        {entries.map((entry, index) => (
          <button
            key={entry.headingId}
            type="button"
            className={`contents-link contents-link-level-${entry.level} ${entry.locked ? "is-locked" : ""}`}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onJump(entry.headingId);
            }}
          >
            <span className="contents-index">{String(startIndex + index + 1).padStart(2, "0")}</span>
            <span className="contents-title">{entry.title}</span>
            <span className="contents-page-number">
              {entry.locked ? "🔒" : entry.readerPageNumber === undefined ? "" : String(entry.readerPageNumber).padStart(2, "0")}
            </span>
            <span className="contents-arrow" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
