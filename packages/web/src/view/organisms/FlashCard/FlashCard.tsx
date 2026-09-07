import type { CSSProperties } from "react";

import { type Direction, SECTION_LABELS, type SectionId } from "../../../types";
import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { SectionLabel } from "../../atoms/SectionLabel/SectionLabel";
import { Text, type TextVariant } from "../../atoms/Text/Text";
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

/* why: 設問と肢は必ず逆の書体になる。設問と肢の書体を別々に受けると
   構文の設問に構文の肢が並ぶ組み合わせを作れてしまうので、direction 1 つから引く */
const PROMPT: Record<Direction, TextVariant> = { forward: "title", reverse: "titleProse" };
const CHOICE_KIND: Record<Direction, ChoiceKind> = { forward: "prose", reverse: "syntax" };

const STACK: CSSProperties = { display: "grid", gap: "1.15rem" };

/* why: ラベルと中身を STACK の間隔より狭くまとめる。同じ間隔だと、
   ラベルがどちらに属するのか読めない */
const GROUP: CSSProperties = { display: "grid", gap: "0.4rem" };

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
      <SectionLabel>{SECTION_LABELS[section]}</SectionLabel>
      <div style={GROUP}>
        <Text variant="micro" tone="muted">
          問題
        </Text>
        <Text as="h2" variant={PROMPT[direction]}>
          {prompt}
        </Text>
      </div>
      <div style={GROUP}>
        <Text variant="micro" tone="muted">
          選択肢
        </Text>
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
