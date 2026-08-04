import styles from "./primitives.module.css";

type Props = {
  title: string;
  description?: string;
  className?: string;
};

export default function SectionHeading({ title, description, className }: Props) {
  return (
    <div className={[styles.sectionHeading, className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
