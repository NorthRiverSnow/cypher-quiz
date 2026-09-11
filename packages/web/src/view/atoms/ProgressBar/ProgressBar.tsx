import type { CSSProperties } from "react";

export type ProgressBarProps = {
  /** 回答の数。左から 正解 / 不正解 / 完了までに残る回答 */
  counts: readonly [number, number, number];
};

/* 色は docs/07_design.md#進捗バー */
const FILL = ["var(--accent)", "var(--alarm)", "var(--rule-soft)"] as const;

const TRACK: CSSProperties = {
  display: "flex",
  height: "0.35rem",
  borderRadius: "var(--radius-pill)",
  background: "var(--rule-soft)",
  /* why: 角丸で端を切る。切らないと左端の区画が角から飛び出す */
  overflow: "hidden",
};

export const ProgressBar = ({ counts }: ProgressBarProps) => {
  const [correct, wrong, left] = counts;
  const total = counts.reduce((sum, count) => sum + count, 0);

  return (
    <div
      role="progressbar"
      aria-label="進捗"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={correct + wrong}
      /* why: 数字を画面に出さないので、読み上げにはここで内訳を渡す */
      aria-valuetext={`${correct} 回 正解、${wrong} 回 不正解、あと ${left} 回`}
      style={TRACK}
    >
      {counts.map((count, part) => (
        /* why: flex-grow を回数そのものにする。0 回の区画は幅を持たない */
        <span key={part} style={{ flexGrow: count, background: FILL[part] }} />
      ))}
    </div>
  );
};
