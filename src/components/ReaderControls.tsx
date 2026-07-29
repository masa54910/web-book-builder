"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { BindingDirection } from "@/config/bookConfig";

export default function ReaderControls({
  bindingDirection,
  current,
  total,
  onFirst,
  onContents,
  onPrevious,
  onNext,
  onJumpToPage,
}: {
  bindingDirection: BindingDirection;
  current: number;
  total: number;
  onFirst: () => void;
  onContents: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToPage: (pageNumber: number) => void;
}) {
  const [pageInput, setPageInput] = useState("");
  const readableTotal = Math.max(total - 2, 1);
  const displayedPageInput = pageInput || String(Math.min(Math.max(current, 1), readableTotal));
  const nextLabel = bindingDirection === "rtl" ? "次へ ←" : "次へ →";
  const previousLabel = bindingDirection === "rtl" ? "→ 前へ" : "← 前へ";

  const submitPageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pageNumber = Number(displayedPageInput);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > readableTotal) {
      setPageInput("");
      return;
    }
    onJumpToPage(pageNumber);
    setPageInput("");
  };

  return (
    <nav className="reader-controls" aria-label="ページ操作">
      <div className="control-cluster">
        <button className="reader-button" type="button" onClick={onFirst} disabled={current === 0}>
          最初へ
        </button>
        <button className="reader-button" type="button" onClick={onContents}>
          目次へ
        </button>
      </div>
      <form className="page-jump-form" onSubmit={submitPageJump}>
        <label className="page-jump-label" htmlFor="page-jump-input">ページ</label>
        <input
          id="page-jump-input"
          className="page-jump-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={readableTotal}
          value={displayedPageInput}
          onChange={(event) => setPageInput(event.target.value)}
          aria-label={`ページ番号を入力（1から${readableTotal}）`}
        />
        <span className="page-jump-total">/ {readableTotal}</span>
        <button className="page-jump-button" type="submit">移動</button>
      </form>
      <div className="control-cluster">
        <button className="reader-button" type="button" onClick={onPrevious} disabled={current === 0}>
          {previousLabel}
        </button>
        <button className="reader-button primary" type="button" onClick={onNext} disabled={current >= total - 1}>
          {nextLabel}
        </button>
      </div>
    </nav>
  );
}
