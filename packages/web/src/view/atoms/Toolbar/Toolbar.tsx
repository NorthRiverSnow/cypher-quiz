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
  background: "var(--ground)",
  borderBottom: "var(--border-width) solid var(--rule-soft)",
};

export const Toolbar = ({ children }: ToolbarProps) => <div style={ROW}>{children}</div>;
