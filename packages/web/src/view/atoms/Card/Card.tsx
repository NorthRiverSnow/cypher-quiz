import type { CSSProperties, ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
};

const CARD: CSSProperties = {
  padding: "var(--space-lg)",
  border: "var(--border-width) solid var(--rule)",
  borderRadius: "var(--radius-card)",
  background: "var(--panel)",
  boxShadow: "var(--shadow)",
};

/* why: article にしない。自己完結した単位として読み上げるかは中身が決める */
export const Card = ({ children }: CardProps) => <div style={CARD}>{children}</div>;
