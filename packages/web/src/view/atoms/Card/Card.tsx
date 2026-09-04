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

/* why: 器だけを持ち、中の並びは組む側に任せる。載せるものごとに間隔が変わる。
 *
 * why: article にしない。自己完結した単位として読み上げるべきかは中身が決めることで、
 * 器が決めてしまうと、フォームや要約を載せたときに意味づけが合わなくなる。
 */
export const Card = ({ children }: CardProps) => <div style={CARD}>{children}</div>;
