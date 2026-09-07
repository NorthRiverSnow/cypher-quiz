import type { CSSProperties, ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
};

const CARD: CSSProperties = {
  padding: "1.4rem 1.5rem 1.6rem",
  border: "1px solid var(--rule)",
  borderRadius: "4px",
  background: "var(--panel)",
  boxShadow: "var(--shadow)",
};

/* why: article にしない。自己完結した単位として読み上げるかは中身が決める */
export const Card = ({ children }: CardProps) => <div style={CARD}>{children}</div>;
