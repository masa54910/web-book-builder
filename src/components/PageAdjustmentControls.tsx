"use client";

import type { ReaderPage } from "@/lib/types";
import { useState } from "react";
import type {
  PageAdjustment,
  PageAdjustmentAlign,
  PageAdjustmentImageSize,
  PageAdjustmentPosition,
  PageAdjustmentSpacing,
} from "@/lib/pageAdjustments";

const IMAGE_SIZES: Array<{ value: PageAdjustmentImageSize; label: string }> = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
  { value: "full-width", label: "本文幅" },
  { value: "full-page", label: "1ページ" },
];
const IMAGE_ALIGNS: Array<{ value: PageAdjustmentAlign; label: string }> = [
  { value: "left", label: "左" },
  { value: "center", label: "中央" },
  { value: "right", label: "右" },
];
const IMAGE_POSITIONS: Array<{ value: PageAdjustmentPosition; label: string }> = [
  { value: "top", label: "上" },
  { value: "center", label: "中央" },
  { value: "bottom", label: "下" },
];
const SPACING: Array<{ value: PageAdjustmentSpacing; label: string }> = [
  { value: "compact", label: "狭い" },
  { value: "normal", label: "標準" },
  { value: "wide", label: "広い" },
];

function isImagePage(page: ReaderPage | null) {
  return page?.kind === "image";
}

function isTextPage(page: ReaderPage | null) {
  return page?.kind === "text";
}

export default function PageAdjustmentControls({
  page,
  pageNumber,
  totalPages,
  value,
  onChange,
  onReset,
  onResetAll,
  onImageAdd,
  imageInsertAnchors,
  onImageAddAtBlock,
  paragraphBlockId,
  paragraphOriginalText,
  paragraphValue,
  onParagraphChange,
  onParagraphReset,
  onClose,
}: {
  page: ReaderPage | null;
  pageNumber: number;
  totalPages: number;
  value?: PageAdjustment;
  onChange: (patch: Partial<PageAdjustment>) => void;
  onReset: () => void;
  onResetAll?: () => void;
  onImageAdd?: (file: File) => void;
  imageInsertAnchors?: Array<{ id: string; label: string }>;
  onImageAddAtBlock?: (file: File, afterBlockId: string) => void;
  paragraphBlockId?: string | null;
  paragraphOriginalText?: string;
  paragraphValue?: string;
  onParagraphChange?: (value: string) => void;
  onParagraphReset?: () => void;
  onClose?: () => void;
}) {
  const [paragraphError, setParagraphError] = useState("");
  const hasPageTarget = page?.kind === "text" || page?.kind === "image";
  const imagePage = isImagePage(page);
  const textPage = isTextPage(page);

  return (
    <section className="page-adjustment-panel" aria-labelledby="page-adjustment-heading">
      <div className="cover-design-panel-heading page-adjustment-panel-heading">
        <div>
          <h3 id="page-adjustment-heading">ページ調整</h3>
          <p className="maker-note">ページ {Math.max(1, pageNumber)} / {Math.max(1, totalPages)}</p>
        </div>
        {onClose ? (
          <button className="cover-design-close" type="button" aria-label="ページ調整を閉じる" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>

      {!hasPageTarget ? (
        <p className="maker-note page-adjustment-empty">このページには調整対象がありません。</p>
      ) : (
        <>
          <div className="cover-design-section">
            <h4>テキスト</h4>
            {textPage && paragraphBlockId && paragraphOriginalText !== undefined && onParagraphChange ? (
              <div className="page-adjustment-paragraph-editor">
                <label className="cover-design-control">
                  <span>本文を調整</span>
                  <textarea
                    rows={6}
                    value={paragraphValue ?? paragraphOriginalText}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const originalWithoutBreaks = paragraphOriginalText.replace(/\r\n?/g, "\n").replace(/\n/g, "");
                      const nextWithoutBreaks = nextValue.replace(/\r\n?/g, "\n").replace(/\n/g, "");
                      if (originalWithoutBreaks !== nextWithoutBreaks) {
                        setParagraphError("本文の文字は変更せず、改行位置だけ調整できます。");
                        return;
                      }
                      setParagraphError("");
                      onParagraphChange(nextValue);
                    }}
                    aria-label="本文の改行を調整"
                  />
                </label>
                <p className="maker-note">Enterで改行できます。本文の文字はそのまま保持されます。</p>
                {paragraphError ? <p className="form-error" role="alert">{paragraphError}</p> : null}
                {paragraphValue !== undefined && onParagraphReset ? (
                  <button className="page-adjustment-secondary-action" type="button" onClick={onParagraphReset}>
                    元の改行に戻す
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="cover-design-controls">
              <label className="cover-design-control">
                <span>改ページ</span>
                <button
                  type="button"
                  className={`page-adjustment-toggle ${value?.pageBreakAfter ? "is-on" : ""}`}
                  aria-pressed={Boolean(value?.pageBreakAfter)}
                  onClick={() => onChange({ pageBreakAfter: !value?.pageBreakAfter })}
                >
                  {value?.pageBreakAfter ? "ON" : "OFF"}
                </button>
              </label>
              <label className="cover-design-control">
                <span>段落余白</span>
                <select
                  value={value?.paragraphSpacing || "normal"}
                  disabled={!textPage}
                  onChange={(event) => onChange({ paragraphSpacing: event.target.value as PageAdjustmentSpacing })}
                >
                  {SPACING.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {value?.pageBreakAfter ? (
              <button className="page-adjustment-secondary-action" type="button" onClick={() => onChange({ pageBreakAfter: false })}>
                改ページを解除
              </button>
            ) : null}
          </div>

          <div className="cover-design-section">
            <h4>画像</h4>
            {onImageAdd ? (
              <label className="page-adjustment-secondary-action page-adjustment-file-action">
                + 画像を追加
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onImageAdd(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
            {textPage && imageInsertAnchors?.length && onImageAddAtBlock ? (
              <div className="page-adjustment-insert-points" aria-label="本文ブロック間への画像挿入">
                <p className="maker-note">本文ブロックの間へ画像を挿入</p>
                {imageInsertAnchors.map((anchor) => (
                  <label className="page-adjustment-secondary-action page-adjustment-file-action" key={anchor.id}>
                    ＋ {anchor.label}の後に挿入
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onImageAddAtBlock(file, anchor.id);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {imagePage ? (
              <div className="cover-design-controls">
                <label className="cover-design-control">
                  <span>サイズ</span>
                  <select value={value?.imageSize || "medium"} onChange={(event) => onChange({ imageSize: event.target.value as PageAdjustmentImageSize })}>
                    {IMAGE_SIZES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="cover-design-control">
                  <span>配置</span>
                  <select value={value?.imageAlign || "center"} onChange={(event) => onChange({ imageAlign: event.target.value as PageAdjustmentAlign })}>
                    {IMAGE_ALIGNS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="cover-design-control">
                  <span>焦点位置</span>
                  <select value={value?.imagePosition || "center"} onChange={(event) => onChange({ imagePosition: event.target.value as PageAdjustmentPosition })}>
                    {IMAGE_POSITIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="cover-design-control">
                  <span>上余白</span>
                  <select value={value?.imageSpacingTop || "normal"} onChange={(event) => onChange({ imageSpacingTop: event.target.value as PageAdjustmentSpacing })}>
                    {SPACING.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="cover-design-control">
                  <span>下余白</span>
                  <select value={value?.imageSpacingBottom || "normal"} onChange={(event) => onChange({ imageSpacingBottom: event.target.value as PageAdjustmentSpacing })}>
                    {SPACING.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <p className="maker-note">画像ページを表示するとサイズ・位置・余白を調整できます。</p>
            )}
            {imagePage ? (
              <button
                className="page-adjustment-secondary-action"
                type="button"
                onClick={() => {
                  if (window.confirm("この画像を非表示にしますか？")) onChange({ imageHidden: true });
                }}
              >
                画像を削除
              </button>
            ) : null}
          </div>

          <div className="page-adjustment-actions">
            <button className="page-adjustment-secondary-action" type="button" onClick={onReset}>
              このページを自動に戻す
            </button>
            {onResetAll ? (
              <button className="page-adjustment-secondary-action" type="button" onClick={onResetAll}>
                すべてのページ調整を解除
              </button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
