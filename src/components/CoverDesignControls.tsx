"use client";

import {
  COVER_LAYOUT_OPTIONS,
  COVER_POSITIONS,
  DEFAULT_COVER_DESIGN,
  type CoverDesign,
  type CoverPosition,
} from "@/lib/coverDesign";

const COVER_POSITION_LABELS: Record<CoverPosition, string> = {
  "top-left": "左上",
  "top-center": "中央上",
  "top-right": "右上",
  "center-left": "左中央",
  center: "中央",
  "center-right": "右中央",
  "bottom-left": "左下",
  "bottom-center": "中央下",
  "bottom-right": "右下",
};

export default function CoverDesignControls({
  value,
  onChange,
  onReset,
  heading = "表紙レイアウト",
  description = "10種類から選び、タイトル・作者名・画像を微調整できます。",
}: {
  value: CoverDesign;
  onChange: (patch: Partial<CoverDesign>) => void;
  onReset?: () => void;
  heading?: string;
  description?: string;
}) {
  return (
    <section className="cover-design-panel" aria-labelledby="cover-design-heading">
      <div className="cover-design-panel-heading">
        <div>
          <h3 id="cover-design-heading">{heading}</h3>
          <p className="maker-note">{description}</p>
        </div>
        <button
          className="maker-small-button"
          type="button"
          onClick={() => {
            if (onReset) onReset();
            else onChange({ ...DEFAULT_COVER_DESIGN });
          }}
        >
          初期設定に戻す
        </button>
      </div>
      <div className="cover-layout-picker" role="radiogroup" aria-label="表紙レイアウト">
        {COVER_LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`cover-layout-option ${value.layout === option.id ? "is-selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={value.layout === option.id}
            onClick={() => onChange({ layout: option.id })}
          >
            <span className={`cover-layout-thumb cover-layout-thumb-${option.id}`} aria-hidden="true">
              <span className="cover-layout-thumb-title" />
              <span className="cover-layout-thumb-image" />
              <span className="cover-layout-thumb-author" />
            </span>
            <span>{option.label}</span>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
      <div className="cover-design-controls">
        <label>
          <span>タイトルサイズ</span>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={value.titleScale}
            onChange={(event) => onChange({ titleScale: Number(event.target.value) })}
          />
          <output>{value.titleScale.toFixed(2)}</output>
        </label>
        <label>
          <span>作者名サイズ</span>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={value.authorScale}
            onChange={(event) => onChange({ authorScale: Number(event.target.value) })}
          />
          <output>{value.authorScale.toFixed(2)}</output>
        </label>
        <label>
          <span>タイトル位置</span>
          <select
            value={value.titlePosition}
            onChange={(event) => onChange({ titlePosition: event.target.value as CoverPosition })}
          >
            {COVER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {COVER_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>作者名位置</span>
          <select
            value={value.authorPosition}
            onChange={(event) => onChange({ authorPosition: event.target.value as CoverPosition })}
          >
            {COVER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {COVER_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>画像サイズ</span>
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.05"
            value={value.imageScale}
            onChange={(event) => onChange({ imageScale: Number(event.target.value) })}
          />
          <output>{value.imageScale.toFixed(2)}</output>
        </label>
        <label>
          <span>画像の表示</span>
          <select
            value={value.imageFit}
            onChange={(event) => onChange({ imageFit: event.target.value as CoverDesign["imageFit"] })}
          >
            <option value="contain">画像全体を表示</option>
            <option value="cover">表紙いっぱいに表示</option>
          </select>
        </label>
        <label>
          <span>画像位置</span>
          <select
            value={value.imagePosition}
            onChange={(event) => onChange({ imagePosition: event.target.value as CoverPosition })}
          >
            {COVER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {COVER_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>文字の読みやすさ</span>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.05"
            value={value.overlayOpacity}
            onChange={(event) => onChange({ overlayOpacity: Number(event.target.value) })}
          />
          <output>{Math.round(value.overlayOpacity * 100)}%</output>
        </label>
      </div>
    </section>
  );
}
