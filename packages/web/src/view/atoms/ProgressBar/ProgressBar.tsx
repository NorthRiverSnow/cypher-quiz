import type { CSSProperties } from "react";

import { Text } from "../Text/Text";

export type ProgressBarProps = {
  /* box ごとの枚数。左から box 0（まだ）/ box 1（1 回正答）/ box 2（完了）
     （docs/01_spec.md#6-出題の順序と習熟度） */
  counts: readonly [number, number, number];
};

/* box に対応する色。完了は正解と同じ緑、1 回正答は進行中の青、まだは地の色 */
const FILL = ["var(--rule)", "var(--accent)", "var(--keep)"] as const;

/* why: 完了が左から伸びるように、box の大きい順に並べる。box の順に並べると
   緑が右端に出て、どこまで進んだのかが読み取れない */
const ORDER = [2, 1, 0] as const;

const TRACK: CSSProperties = {
  display: "flex",
  /* why: 帯の太さは部品の寸法。余白の段階には含めない */
  height: "0.35rem",
  borderRadius: "var(--radius-pill)",
  background: "var(--rule-soft)",
  /* why: 角丸で端を切る。切らないと左端の区画が角から飛び出す */
  overflow: "hidden",
};

export const ProgressBar = ({ counts }: ProgressBarProps) => {
  const total = counts.reduce((a, b) => a + b, 0);
  const done = counts[2];

  return (
    <div style={{ display: "grid", gap: "var(--space-2xs)" }}>
      <Text variant="micro" tone="muted">
        残り {total - done} / {total}
      </Text>
      <div
        role="progressbar"
        aria-label="進捗"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        style={TRACK}
      >
        {ORDER.map((box) => (
          /* why: flex-grow を枚数そのものにする。0 枚の区画は幅を持たない */
          <span key={box} style={{ flexGrow: counts[box], background: FILL[box] }} />
        ))}
      </div>
    </div>
  );
};
