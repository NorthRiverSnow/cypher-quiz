import type { CSSProperties } from "react";

import { type Direction, SECTION_LABELS, type SectionId } from "../../../types";
import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { type ChoiceKind, ChoiceList } from "../../molecules/ChoiceList/ChoiceList";

export type FlashCardProps = {
  section: SectionId;
  direction: Direction;
  prompt: string;
  choices: readonly string[];
  selected?: number;
  onSelect: (index: number) => void;
  onAnswer: () => void;
};

/* why: 設問と肢は必ず逆の書体になる。promptKind と choiceKind を別々に受けると
   構文の設問に構文の肢が並ぶ組み合わせを作れてしまうので、direction 1 つから引く */
const CHOICE_KIND: Record<Direction, ChoiceKind> = { forward: "prose", reverse: "syntax" };

const PROMPT: Record<Direction, CSSProperties> = {
  forward: { fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 600, lineHeight: 1.5 },
  /* why: 逆順の設問は文なので、肢の等幅と対にして明朝に振る。
     どちらも本文書体だと設問と肢が地続きに見える */
  reverse: { fontFamily: "var(--font-serif)", fontSize: "1.1rem", lineHeight: 1.75 },
};

const STACK: CSSProperties = { display: "grid", gap: "1.15rem" };

/* why: 大文字マイクロラベルの型（docs/05_reference.md#意匠）から text-transform を外す。
   ラベルは和文で、uppercase では何も変わらない */
const MICRO: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.7rem",
  letterSpacing: "0.12em",
  color: "var(--muted)",
};

const SECTION: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "0.7rem",
  alignItems: "center",
  ...MICRO,
};

/* why: ラベルと中身を STACK の間隔より狭くまとめる。同じ間隔だと、
   ラベルがどちらに属するのか読めない */
const GROUP: CSSProperties = { display: "grid", gap: "0.4rem" };

const RULE: CSSProperties = { height: "1px", background: "var(--rule-soft)" };

const ACTIONS: CSSProperties = { display: "flex", justifyContent: "flex-end" };

export const FlashCard = ({
  section,
  direction,
  prompt,
  choices,
  selected,
  onSelect,
  onAnswer,
}: FlashCardProps) => (
  <Card>
    <div style={STACK}>
      <div style={SECTION}>
        <span>§ {SECTION_LABELS[section]}</span>
        <span style={RULE} aria-hidden />
      </div>
      <div style={GROUP}>
        <span style={MICRO}>問題</span>
        <h2 style={{ margin: 0, color: "var(--ink)", ...PROMPT[direction] }}>{prompt}</h2>
      </div>
      <div style={GROUP}>
        <span style={MICRO}>選択肢</span>
        <ChoiceList
          choices={choices}
          kind={CHOICE_KIND[direction]}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
      <div style={ACTIONS}>
        {/* why: 肢を押した時点では回答にしない。押し間違いをここで取り消せる */}
        <Button onClick={onAnswer} disabled={selected === undefined}>
          決定
        </Button>
      </div>
    </div>
  </Card>
);
