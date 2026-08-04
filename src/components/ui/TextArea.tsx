import styles from "./primitives.module.css";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
  error?: boolean;
};

export default function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows,
  disabled,
  maxLength,
  error,
}: Props) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={[styles.textareaBase, error ? styles.inputError : ""].filter(Boolean).join(" ")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
