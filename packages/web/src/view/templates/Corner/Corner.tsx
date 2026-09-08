import type { CSSProperties, ReactNode } from "react";

export type CornerProps = { children: ReactNode };

const BOX: CSSProperties = {
  position: "fixed",
  top: "var(--space-md)",
  right: "var(--space-md)",
  /* why: 本文より前に出す。カードは影を持つだけで層を作らないので 1 で足りる */
  zIndex: 1,
};

export const Corner = ({ children }: CornerProps) => <div style={BOX}>{children}</div>;
