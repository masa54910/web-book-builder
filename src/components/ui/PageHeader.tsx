import type { ReactNode } from "react";

import styles from "./primitives.module.css";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  backNavigation?: ReactNode;
  className?: string;
};

export default function PageHeader({ eyebrow, title, description, action, backNavigation, className }: Props) {
  return (
    <div className={[styles.pageHeader, className].filter(Boolean).join(" ")}>
      <div className={styles.pageHeaderText}>
        {eyebrow ? <p className={styles.pageHeaderEyebrow}>{eyebrow}</p> : null}
        {backNavigation}
        <h1>{title}</h1>
        {description ? <p className={styles.pageHeaderDesc}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
