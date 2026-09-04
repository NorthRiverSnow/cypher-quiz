import type { MouseEvent } from "react";

import styles from "./ChoiceList.module.css";

export type ChoiceKind = "syntax" | "prose";

export type ChoiceListProps = {
  choices: readonly string[];
  kind: ChoiceKind;
  selected?: number;
  onSelect: (index: number) => void;
};

export const ChoiceList = ({ choices, kind, selected, onSelect }: ChoiceListProps) => {
  /* why: 肢ごとにクロージャを作らず、番号は data 属性から読む */
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
          <span className={styles.ordinal}>{i + 1}</span>
          <span className={styles[kind]}>{choice}</span>
        </button>
      ))}
    </div>
  );
};
