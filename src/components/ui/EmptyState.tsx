import type { ReactNode } from "react";

import Button from "./Button";
import styles from "./primitives.module.css";

type Props = {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  icon?: ReactNode;
  className?: string;
};

export default function EmptyState({ title, description, action, icon, className }: Props) {
  return (
    <div className={[styles.emptyWrap, className].filter(Boolean).join(" ")}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyDescription}>{description}</p>
      {action ? <Button href={action.href} variant="primary">{action.label}</Button> : null}
    </div>
  );
}
