import { SAMPLE_NOTE_TEMPLATE, SAMPLE_X_TEMPLATE } from "@/lib/sampleShareTemplates";

import styles from "./DemoPages.module.css";

type Platform = "x" | "note";

export default function ShareTemplateModalSample({ platform }: { platform: Platform }) {
  const template = platform === "x" ? SAMPLE_X_TEMPLATE : SAMPLE_NOTE_TEMPLATE;
  const serviceLabel = platform === "x" ? "X共有" : "note共有";
  const actionLabel = platform === "x" ? "Xで共有" : "noteを開く";

  return (
    <div className={styles.shareTemplateModalStage} aria-label={`${serviceLabel}テンプレート表示の見本`}>
      <div className={styles.shareTemplateModal}>
        <div className={styles.shareTemplateModalHeader}>
          <div>
            <span className={styles.shareTemplateModalKicker}>共有テンプレート</span>
            <strong>{serviceLabel}</strong>
          </div>
          <span className={styles.shareTemplateModalClose} aria-hidden="true">×</span>
        </div>
        <p className={styles.shareTemplateModalLead}>共有ボタンを押したときの表示イメージ</p>
        <pre className={styles.shareTemplateModalText}>{template}</pre>
        <div className={styles.shareTemplateModalActions} aria-hidden="true">
          <span className={styles.shareTemplateModalSecondary}>テンプレートをコピー</span>
          <span className={styles.shareTemplateModalPrimary}>{actionLabel}</span>
        </div>
      </div>
    </div>
  );
}
