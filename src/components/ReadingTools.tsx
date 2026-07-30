"use client";

import { useState } from "react";
import type { SyntheticEvent } from "react";

import type { LastRead, StickyNote } from "@/lib/readerStorage";

function stopPageFlip(event: SyntheticEvent) {
  event.stopPropagation();
}

export default function ReadingTools({
  isBookmarked,
  stickyNotes,
  resumePosition,
  autoFlipEnabled,
  autoFlipSeconds,
  autoFlipLoop,
  autoFlipStartMode,
  onToggleBookmark,
  onJumpToStickyNote,
  onRemoveStickyNote,
  onContinue,
  onToggleAutoFlip,
  onAutoFlipSecondsChange,
  onAutoFlipLoopChange,
  onAutoFlipStartModeChange,
}: {
  isBookmarked: boolean;
  stickyNotes: StickyNote[];
  resumePosition: LastRead | null;
  autoFlipEnabled: boolean;
  autoFlipSeconds: number;
  autoFlipLoop: boolean;
  autoFlipStartMode: "cover" | "current";
  onToggleBookmark: () => void;
  onJumpToStickyNote: (note: StickyNote) => void;
  onRemoveStickyNote: (note: StickyNote) => void;
  onContinue: () => void;
  onToggleAutoFlip: () => void;
  onAutoFlipSecondsChange: (seconds: number) => void;
  onAutoFlipLoopChange: (enabled: boolean) => void;
  onAutoFlipStartModeChange: (mode: "cover" | "current") => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="reading-tools" aria-label="読書補助">
        <button className="reader-button tool-button" type="button" onClick={onToggleBookmark}>
          {isBookmarked ? "付箋を外す" : "付箋を付ける"}
        </button>
        <button
          className="reader-button tool-button"
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          付箋一覧{stickyNotes.length ? `（${stickyNotes.length}）` : ""}
        </button>
        {resumePosition ? (
          <button className="continue-reading-button" type="button" onClick={onContinue}>
            <span>前回の続きから読む</span>
            <small>
              P.{resumePosition.pageNumber}　{resumePosition.chapterTitle}
            </small>
          </button>
        ) : null}
      </div>

      <div
        className="auto-flip-tools"
        aria-label="自動めくり"
        onPointerDown={stopPageFlip}
        onMouseDown={stopPageFlip}
        onTouchStart={stopPageFlip}
        onClick={stopPageFlip}
      >
        <button className="reader-button tool-button" type="button" onClick={onToggleAutoFlip}>
          {autoFlipEnabled ? "自動めくり停止" : "自動めくり開始"}
        </button>
        <label>
          <span>速度</span>
          <select
            value={autoFlipSeconds}
            onChange={(event) => onAutoFlipSecondsChange(Number(event.target.value))}
          >
            <option value={3}>速い（3秒）</option>
            <option value={5}>標準（5秒）</option>
            <option value={8}>ゆっくり（8秒）</option>
            <option value={12}>朗読向け（12秒）</option>
          </select>
        </label>
        <label>
          <span>開始位置</span>
          <select
            value={autoFlipStartMode}
            onChange={(event) => onAutoFlipStartModeChange(event.target.value as "cover" | "current")}
          >
            <option value="current">現在ページ</option>
            <option value="cover">表紙から</option>
          </select>
        </label>
        <label className="auto-flip-check">
          <input
            type="checkbox"
            checked={autoFlipLoop}
            onChange={(event) => onAutoFlipLoopChange(event.target.checked)}
          />
          <span>ループ</span>
        </label>
      </div>

      {isOpen ? (
        <div className="sticky-note-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <section
            className="sticky-note-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticky-note-title"
            onPointerDown={stopPageFlip}
            onMouseDown={stopPageFlip}
            onTouchStart={stopPageFlip}
            onClick={stopPageFlip}
          >
            <div className="sticky-note-panel-header">
              <h2 id="sticky-note-title">付箋一覧</h2>
              <button type="button" aria-label="付箋一覧を閉じる" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>
            {stickyNotes.length ? (
              <ul className="sticky-note-list">
                {stickyNotes.map((note) => (
                  <li key={note.pageId}>
                    <div className="sticky-note-item">
                      <button
                        className="sticky-note-jump"
                        type="button"
                        onClick={() => {
                          onJumpToStickyNote(note);
                          setIsOpen(false);
                        }}
                      >
                        <strong>
                          P.{note.pageNumber}　{note.chapterTitle}
                        </strong>
                        <span>{note.preview}</span>
                      </button>
                      <button
                        className="sticky-note-remove"
                        type="button"
                        aria-label={`P.${note.pageNumber}の付箋を外す`}
                        onClick={() => onRemoveStickyNote(note)}
                      >
                        外す
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sticky-note-empty">付箋はまだありません</p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
