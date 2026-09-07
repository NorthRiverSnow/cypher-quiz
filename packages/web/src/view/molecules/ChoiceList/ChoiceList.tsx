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
    <div role="radiogroup" aria-label="選択肢" style={{ display: "grid", gap: "0.5rem" }}>
      {choices.map((choice, i) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={selected === i}
          data-index={i}
          className={styles.choice}
          onClick={handleClick}
        >
          {/* why: 番号の色だけ props で決める。tone はインライン style になるので、
              面と同じように [aria-checked] のセレクタでは塗れない */}
          <Text variant="numeral" tone={selected === i ? "accent" : "muted"}>
            {i + 1}
          </Text>
          <Text variant={kind}>{choice}</Text>
        </button>
      ))}
    </div>
  );
};
