import type { ChangeEvent, CSSProperties } from "react";

import { TEXT, Text } from "../Text/Text";
import styles from "./TextField.module.css";

export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
  placeholder?: string;
  disabled?: boolean;
  /* 入力欄の下に置く補足。何を入れる欄なのかがラベルだけでは分からないときに使う */
  hint?: string;
};

const GROUP: CSSProperties = { display: "grid", gap: "var(--space-2xs)" };

const FIELD: CSSProperties = {
  ...TEXT.code,
  width: "100%",
  padding: "var(--space-xs) var(--space-sm)",
  border: "var(--border-width) solid var(--rule-soft)",
  borderRadius: "var(--radius)",
  background: "var(--panel-sunken)",
};

/* why: autoComplete を渡す口を作っていない。off はパスワード欄では無視するブラウザがあり、
   渡せる口があると効くように見える */
export const TextField = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  hint,
}: TextFieldProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <div style={GROUP}>
      {/* why: label で包んで id を使わない。同じ画面に同じ欄が 2 つ出ても衝突しない */}
      <label style={GROUP}>
        <Text variant="micro" tone="muted">
          {label}
        </Text>
        <input
          className={styles.input}
          style={FIELD}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
        />
      </label>
      {/* why: 補足は label の外に置く。中に入れると読み上げの名前に連結され、
          欄の名前が補足ごと読まれる */}
      {hint !== undefined && (
        <Text variant="annotation" tone="muted">
          {hint}
        </Text>
      )}
    </div>
  );
};
