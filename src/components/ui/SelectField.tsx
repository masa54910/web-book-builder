import type { ReactNode } from "react";

import styles from "./primitives.module.css";

type Option = {
  value: string;
  label: string;
};

type Props = {
  id: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
  after?: ReactNode;
};

export default function SelectField({ id, value, options, disabled, onChange, after }: Props) {
  return (
    <>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className={styles.selectBase}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {after}
    </>
  );
}
