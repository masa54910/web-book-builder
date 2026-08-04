import styles from "./primitives.module.css";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "number";
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  error?: boolean;
};

export default function TextInput({
  id,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  disabled,
  maxLength,
  error,
}: Props) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      autoComplete={autoComplete}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={[styles.inputBase, error ? styles.inputError : ""].filter(Boolean).join(" ")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
