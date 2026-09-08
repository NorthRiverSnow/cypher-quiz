import type { MouseEvent } from "react";

import { Text } from "../../atoms/Text/Text";
import styles from "./ChoiceList.module.css";

export type ChoiceKind = "syntax" | "prose";

export type ChoiceListProps = {
  choices: readonly string[];
  kind: ChoiceKind;
  selected?: number;
  onSelect: (index: number) => void;
};

export const ChoiceList = ({ choices, kind, selected, onSelect }: ChoiceListProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onSelect(Number(event.currentTarget.dataset["index"]));
  };

  return (
    <div role="radiogroup" aria-label="選択肢" style={{ display: "grid", gap: "var(--space-xs)" }}>
      {choices.map((choice, idx) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={selected === idx}
          data-index={idx}
          className={styles.choice}
          onClick={handleClick}
        >
          <Text variant="numeral" tone={selected === idx ? "accent" : "muted"}>
            {idx + 1}
          </Text>
          <Text variant={kind}>{choice}</Text>
        </button>
      ))}
    </div>
  );
};
