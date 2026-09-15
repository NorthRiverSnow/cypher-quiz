import type { CSSProperties } from "react";

import type { SectionId } from "../../../types";
import { Text } from "../../atoms/Text/Text";
import { SectionRow } from "../../molecules/SectionRow/SectionRow";

export type SectionChoice = Readonly<{
  id: SectionId;
  label: string;
  /** 行の右端に出す状態。`0 / 10` や `進行中`（docs/01_spec.md#7-画面と導線） */
  status: string;
  checked: boolean;
  /** 成績をリセットする。**渡さなければボタンを出さない** */
  onReset?: () => void;
}>;

export type SectionPickerProps = {
  sections: readonly SectionChoice[];
  /** 「全て」の行の右端 */
  allStatus: string;
  onToggle: (id: SectionId) => void;
  /** 全て選ぶか、全て外すか。**どちらになるかは呼ばれた側が決める** */
  onToggleAll: () => void;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-2xs)" };

const RULE: CSSProperties = {
  height: "var(--border-width)",
  margin: "var(--space-2xs) 0",
  background: "var(--rule-soft)",
};

export const SectionPicker = ({
  sections,
  allStatus,
  onToggle,
  onToggleAll,
}: SectionPickerProps) => (
  <div style={STACK}>
    <Text variant="micro" tone="muted">
      出す章
    </Text>
    <SectionRow
      label="全て"
      status={allStatus}
      /* why: [].every は true。章が 0 本のときに「全て」が入って見える */
      checked={sections.length > 0 && sections.every(({ checked }) => checked)}
      onToggle={onToggleAll}
    />
    <span style={RULE} aria-hidden />
    {sections.map(({ id, label, status, checked, onReset }) => (
      <SectionRow
        key={id}
        label={label}
        status={status}
        checked={checked}
        onToggle={() => onToggle(id)}
        {...(onReset === undefined ? {} : { onReset })}
      />
    ))}
  </div>
);
