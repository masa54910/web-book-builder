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

const SCALE_MIN = 0.7;
const SCALE_MAX = 1.5;
const SCALE_STEP = 0.05;

function stepScale(value: number, delta: number) {
  const next = value + delta * SCALE_STEP;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(next.toFixed(2))));
}

function ScaleStepper({
  label,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="cover-design-control">
      <span>{label}</span>
      <div className="cover-scale-stepper">
        <button type="button" aria-label={decreaseLabel} onClick={() => onChange(stepScale(value, -1))}>
          −
        </button>
        <output aria-live="polite">{Math.round(value * 100)}%</output>
        <button type="button" aria-label={increaseLabel} onClick={() => onChange(stepScale(value, 1))}>
          ＋
        </button>
      </div>
    </div>
  );
}

export default function CoverDesignControls({
  value,
  onChange,
  onReset,
  onClose,
  title = "",
  heading = "表紙レイアウト",
  description = "10種類から選び、タイトル・作者名・画像を微調整できます。",
}: {
  value: CoverDesign;
  onChange: (patch: Partial<CoverDesign>) => void;
  onReset?: () => void;
  onClose?: () => void;
  title?: string;
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
        {onClose ? (
          <button className="cover-design-close" type="button" aria-label="表紙調整を閉じる" onClick={onClose}>
            ×
          </button>
        ) : null}
      </div>

      <div className="cover-design-panel-body">
        <div className="cover-design-panel-column cover-design-panel-layout">
          <div className="cover-design-section">
            <h4>レイアウト</h4>
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
                  <span className="cover-layout-name">{option.label}</span>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cover-design-panel-column cover-design-panel-options">
          <div className="cover-design-section">
            <h4>文字</h4>
            <div className="cover-design-controls">
              <label className="cover-design-control cover-title-override-control">
                <span>表紙タイトル</span>
                <textarea
                  value={value.titleTextOverride ?? ""}
                  maxLength={120}
                  rows={3}
                  placeholder={title || "作品タイトル"}
                  aria-label="表紙タイトルの改行"
                  aria-describedby="cover-title-override-help"
                  onChange={(event) => onChange({ titleTextOverride: event.target.value })}
                />
                <small id="cover-title-override-help" className="maker-note">
                  Enterで改行できます。表紙の表示だけが変わります。
                </small>
                {value.titleTextOverride ? (
                  <button
                    className="cover-title-override-reset"
                    type="button"
                    onClick={() => onChange({ titleTextOverride: "" })}
                  >
                    元のタイトルに戻す
                  </button>
                ) : null}
              </label>
              <ScaleStepper
                label="タイトルサイズ"
                value={value.titleScale}
                onChange={(titleScale) => onChange({ titleScale })}
                decreaseLabel="タイトルサイズを小さくする"
                increaseLabel="タイトルサイズを大きくする"
              />
              <label className="cover-design-control">
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
              <ScaleStepper
                label="作者名サイズ"
                value={value.authorScale}
                onChange={(authorScale) => onChange({ authorScale })}
                decreaseLabel="作者名サイズを小さくする"
                increaseLabel="作者名サイズを大きくする"
              />
              <label className="cover-design-control">
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
            </div>
          </div>

          <div className="cover-design-section">
            <h4>画像</h4>
            <div className="cover-design-controls">
              <ScaleStepper
                label="画像サイズ"
                value={value.imageScale}
                onChange={(imageScale) => onChange({ imageScale })}
                decreaseLabel="画像サイズを小さくする"
                increaseLabel="画像サイズを大きくする"
              />
              <label className="cover-design-control">
                <span>画像の表示</span>
                <select
                  value={value.imageFit}
                  onChange={(event) => onChange({ imageFit: event.target.value as CoverDesign["imageFit"] })}
                >
                  <option value="contain">画像全体を表示</option>
                  <option value="cover">表紙いっぱいに表示</option>
                </select>
              </label>
              <label className="cover-design-control">
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
            </div>
          </div>

          <div className="cover-design-section">
            <h4>可読性</h4>
            <div className="cover-design-controls">
              <label className="cover-design-control cover-overlay-control">
                <span>オーバーレイ</span>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.05"
                  value={value.overlayOpacity}
                  aria-label="文字の読みやすさ"
                  onChange={(event) => onChange({ overlayOpacity: Number(event.target.value) })}
                />
                <output>{Math.round(value.overlayOpacity * 100)}%</output>
              </label>
            </div>
          </div>
        </div>
      </div>

      <button
        className="cover-design-reset"
        type="button"
        onClick={() => {
          if (onReset) onReset();
          else onChange({ ...DEFAULT_COVER_DESIGN });
        }}
      >
        初期設定に戻す
      </button>
    </section>
  );
}
