import { Icon } from "../../atoms/Icon/Icon";
import { Text } from "../../atoms/Text/Text";
import styles from "./SectionRow.module.css";

export type SectionRowProps = {
  label: string;
  /** 行の右端に出す状態。`0 / 10` や `進行中`（docs/01_spec.md#7-画面と導線） */
  status: string;
  checked: boolean;
  onToggle: () => void;
};

export const SectionRow = ({ label, status, checked, onToggle }: SectionRowProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    className={styles.toggle}
    onClick={onToggle}
  >
    <Icon
      name={checked ? "check_box" : "check_box_outline_blank"}
      color={checked ? "var(--accent)" : "var(--muted)"}
    />
    <Text variant="annotation">{label}</Text>
    <Text variant="code" tone="soft">
      {status}
    </Text>
  </button>
);
