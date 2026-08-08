"use client";

import type { BookConfig } from "@/config/bookConfig";
import type { CoverDesign } from "@/lib/coverDesign";
import CoverDesignControls from "./CoverDesignControls";
import CoverPage from "./CoverPage";

export default function CoverAdjustModal({
  config,
  value,
  onChange,
  onReset,
  onClose,
}: {
  config: BookConfig;
  value: CoverDesign;
  onChange: (patch: Partial<CoverDesign>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="cover-adjust-modal-backdrop">
      <section className="cover-adjust-modal" role="dialog" aria-modal="true" aria-labelledby="cover-adjust-modal-heading">
        <header className="cover-adjust-modal-heading">
          <h2 id="cover-adjust-modal-heading">表紙を調整</h2>
          <button className="cover-adjust-modal-close" type="button" aria-label="表紙調整を閉じる" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="cover-adjust-modal-body">
          <div className="cover-adjust-preview" aria-label="表紙プレビュー">
            <CoverPage config={{ ...config, coverDesign: value }} />
          </div>
          <div className="cover-adjust-controls">
            <CoverDesignControls
              value={value}
              onChange={onChange}
              onReset={onReset}
              title={config.title}
              heading="表紙デザイン"
              description="表紙の見た目をPreviewで確認しながら調整できます。"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
