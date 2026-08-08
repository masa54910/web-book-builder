"use client";

import {
  COVER_LAYOUT_OPTIONS,
  COVER_POSITIONS,
  COVER_AUTHOR_SCALE_MAX,
  COVER_AUTHOR_SCALE_MIN,
  COVER_TITLE_IMAGE_SCALE_MAX,
  COVER_TITLE_IMAGE_SCALE_MIN,
  DEFAULT_COVER_DESIGN,
  MAX_COVER_TITLE_OVERRIDE_LENGTH,
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

const SCALE_STEP = 0.05;

function stepScale(value: number, delta: number, min: number, max: number) {
  const next = value + delta * SCALE_STEP;
  return Math.min(max, Math.max(min, Number(next.toFixed(2))));
}

function ScaleStepper({
  label,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  min: number;
  max: number;
}) {
  return (
    <div className="cover-design-control">
      <span>{label}</span>
      <div className="cover-scale-stepper">
        <button type="button" aria-label={decreaseLabel} onClick={() => onChange(stepScale(value, -1, min, max))}>
          −
        </button>
        <output aria-live="polite">{Math.round(value * 100)}%</output>
        <button type="button" aria-label={increaseLabel} onClick={() => onChange(stepScale(value, 1, min, max))}>
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
                  value={value.titleTextOverride ?? title}
                  maxLength={MAX_COVER_TITLE_OVERRIDE_LENGTH}
                  rows={3}
                  aria-label="表紙タイトルの改行"
                  aria-describedby="cover-title-override-help"
                  onChange={(event) => onChange({ titleTextOverride: event.target.value })}
                />
                <small id="cover-title-override-help" className="maker-note">
                  Enterで改行できます。表紙の表示だけが変わります。
                </small>
                <small className="maker-note cover-title-line-hint">
                  表紙上の1行目安：約{Math.round(12 / value.titleScale)}文字
                </small>
              </label>
              {value.titleTextOverride !== undefined ? (
                <button
                  className="cover-title-override-reset"
                  type="button"
                  onClick={() => onChange({ titleTextOverride: undefined })}
                >
                  元のタイトルに戻す
                </button>
              ) : null}
              <label className="cover-design-toggle">
                <input
                  type="checkbox"
                  checked={value.titleVisible !== false}
                  onChange={(event) => onChange({ titleVisible: event.target.checked })}
                />
                <span>タイトルを表示</span>
              </label>
              <ScaleStepper
                label="タイトルサイズ"
                value={value.titleScale}
                onChange={(titleScale) => onChange({ titleScale })}
                min={COVER_TITLE_IMAGE_SCALE_MIN}
                max={COVER_TITLE_IMAGE_SCALE_MAX}
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
                min={COVER_AUTHOR_SCALE_MIN}
                max={COVER_AUTHOR_SCALE_MAX}
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
              <label className="cover-design-toggle">
                <input
                  type="checkbox"
                  checked={value.authorVisible !== false}
                  onChange={(event) => onChange({ authorVisible: event.target.checked })}
                />
                <span>作者名を表示</span>
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
                min={COVER_TITLE_IMAGE_SCALE_MIN}
                max={COVER_TITLE_IMAGE_SCALE_MAX}
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
