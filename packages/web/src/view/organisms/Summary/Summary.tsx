import type { CSSProperties } from "react";

import { type Direction, DIRECTION_LABELS, SECTION_LABELS, type SectionId } from "../../../types";
import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
import { Note } from "../../molecules/Note/Note";
import styles from "./Summary.module.css";

export type SectionScore = {
  section: SectionId;
  asked: number;
  correct: number;
};

export type MissedCard = {
  section: SectionId;
  name: string;
  direction: Direction;
};

export type SummaryProps = {
  asked: number;
  correct: number;
  bySection: readonly SectionScore[];
  missed: readonly MissedCard[];
  /* 一覧の行を押したとき。そのカードの裏をもう一度開く */
  onOpenCard: (card: MissedCard) => void;
  onRestart: () => void;
  onRetryMissed: () => void;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

const GROUP: CSSProperties = { display: "grid", gap: "var(--space-xs)" };

const SCORE: CSSProperties = { display: "flex", alignItems: "baseline", gap: "var(--space-sm)" };

/* why: 列は一覧が持ち、行は subgrid でそれを使う。行ごとに列を組むと幅が行ごとに決まり、
   桁数の違いで位置が動く。セルを直接並べても揃うが、行が要素として消えて押せなくなる */
const SCORES: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto auto auto",
  rowGap: "var(--space-2xs)",
  columnGap: "var(--space-2xs)",
};

const SCORE_ROW: CSSProperties = {
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  alignItems: "baseline",
};

const NUM: CSSProperties = { justifySelf: "end" };

/* why: font-weight は継承されるので、style を持たない Text ではなくセルに置く */
const NUM_DONE: CSSProperties = { ...NUM, fontWeight: "var(--weight-semibold)" };

const MISSED: CSSProperties = { display: "grid", gap: "var(--space-2xs)" };

/* why: 内側に余白を取り、同じ幅の負の margin で外へ戻す。押せる範囲は字より広くなり、
   字の左端はラベルと揃ったままになる */
const MISSED_ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "var(--space-sm)",
  alignItems: "baseline",
  padding: "var(--space-2xs) var(--space-xs)",
  margin: "0 calc(-1 * var(--space-xs))",
};

const ACTIONS: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};

export const Summary = ({
  asked,
  correct,
  bySection,
  missed,
  onOpenCard,
  onRestart,
  onRetryMissed,
}: SummaryProps) => {
  const rate = asked === 0 ? 0 : Math.round((correct / asked) * 100);

  return (
    <Card>
      <div style={STACK}>
        <Text as="h2" variant="titleProse">
          お疲れ様でした
        </Text>

        <div style={SCORE}>
          <Text variant="display" tone="accent">
            {rate}%
          </Text>
          <Text variant="annotation" tone="soft">
            {asked} 問中 {correct} 問 正解
          </Text>
        </div>

        <div style={GROUP}>
          <Text variant="micro" tone="muted">
            章別
          </Text>
          <div style={SCORES}>
            {bySection.map((score) => {
              const done = score.correct === score.asked;
              const cell = done ? NUM_DONE : NUM;
              const tone = done ? "keep" : "soft";

              return (
                <div key={score.section} style={SCORE_ROW}>
                  <Text variant="annotation">{SECTION_LABELS[score.section]}</Text>
                  <span style={cell}>
                    <Text variant="code" tone={tone}>
                      {score.correct}
                    </Text>
                  </span>
                  <span style={cell}>
                    <Text variant="code" tone={tone}>
                      /
                    </Text>
                  </span>
                  <span style={cell}>
                    <Text variant="code" tone={tone}>
                      {score.asked}
                    </Text>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {missed.length === 0 ? (
          <Note tone="keep" icon="info" iconLabel="お知らせ">
            全問正解です。もう一度回すと、並びを変えて出し直します。
          </Note>
        ) : (
          <div style={GROUP}>
            <Text variant="micro" tone="muted">
              不正解のカード（クリックで正解を確認）
            </Text>
            <div style={MISSED}>
              {missed.map((card) => (
                <button
                  key={`${card.name}-${card.direction}`}
                  type="button"
                  style={MISSED_ROW}
                  className={styles.card}
                  onClick={() => onOpenCard(card)}
                >
                  <Text variant="syntax">{card.name}</Text>
                  <Text variant="micro" tone="muted">
                    {DIRECTION_LABELS[card.direction]}
                  </Text>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={ACTIONS}>
          {missed.length === 0 ? (
            <Button onClick={onRestart}>もう一度</Button>
          ) : (
            <>
              <Button variant="quiet" onClick={onRestart}>
                もう一度
              </Button>
              <Button onClick={onRetryMissed}>不正解だけもう一度</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
