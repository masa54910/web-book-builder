import styles from "./primitives.module.css";

type Props = {
  label: string;
  className?: string;
};

export default function LoadingState({ label, className }: Props) {
  return (
    <div className={[styles.loadingWrap, className].filter(Boolean).join(" ")} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.loadingText}>{label}</p>
    </div>
  );
}
