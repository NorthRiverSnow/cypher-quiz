import type { CSSProperties, ReactNode } from "react";

export type ToolbarProps = { children: ReactNode };

const ROW: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-2xs)",
  /* why: 高さを道具に合わせて固定する。中身が空のときに行が潰れると、
     道具の有無で下の器の位置が動く */
  minHeight: "var(--tool-size)",
  padding: "var(--space-2xs)",
  /* why: 面を --ground にして、下に続く本文の面と沈み方を変える */
  background: "var(--ground)",
  /* why: 枠は親が持つ。ここは本文との仕切りだけを引く */
  borderBottom: "var(--border-width) solid var(--rule-soft)",
};

export const Toolbar = ({ children }: ToolbarProps) => <div style={ROW}>{children}</div>;
