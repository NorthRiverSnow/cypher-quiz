import type { CSSProperties, ReactNode } from "react";

/* 値の一覧と用途は docs/07_design.md#5-文字の段階 */
export const TEXT = {
  micro: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    lineHeight: 1.6,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  /* why: 行送りだけ code より広い。番号が肢の 1 行目に寄る */
  numeral: { fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.9 },
  code: { fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.75 },
  annotation: { fontSize: "0.875rem", lineHeight: 1.75 },
  prose: { fontSize: "1rem", lineHeight: 1.75 },
  syntax: {
    fontFamily: "var(--font-mono)",
    fontSize: "1rem",
    fontWeight: "var(--weight-semibold)",
    lineHeight: 1.9,
  },
  titleProse: { fontFamily: "var(--font-serif)", fontSize: "1.125rem", lineHeight: 1.75 },
  title: {
    fontFamily: "var(--font-mono)",
    fontSize: "1.3rem",
    fontWeight: "var(--weight-semibold)",
    lineHeight: 1.5,
  },
  display: {
    fontFamily: "var(--font-serif)",
    fontSize: "1.9rem",
    fontWeight: "var(--weight-black)",
    lineHeight: 1.32,
  },
} as const satisfies Record<string, CSSProperties>;

export type TextVariant = keyof typeof TEXT;

export const TONES = {
  ink: "var(--ink)",
  soft: "var(--ink-soft)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  keep: "var(--keep)",
  alarm: "var(--alarm)",
  warn: "var(--warn)",
  team: "var(--team)",
  engineer: "var(--engineer)",
  service: "var(--service)",
  incident: "var(--incident)",
} as const;

export type TextTone = keyof typeof TONES;

export type TextProps = {
  variant: TextVariant;
  as?: "span" | "p" | "div" | "code" | "h1" | "h2" | "h3";
  tone?: TextTone;
  children: ReactNode;
};

export const Text = ({ variant, as: Tag = "span", tone, children }: TextProps) => (
  <Tag
    style={{
      /* why: h1 / h2 / p のブラウザ既定 margin を毎回消さずに済ませる。
         間隔は載せる側が gap で決める */
      margin: 0,
      ...TEXT[variant],
      ...(tone === undefined ? {} : { color: TONES[tone] }),
    }}
  >
    {children}
  </Tag>
);
