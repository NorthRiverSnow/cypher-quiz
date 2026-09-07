import type { CSSProperties, ReactNode } from "react";

/* 文字の型はこの表だけが持つ。小さい順。一覧は docs/07_design.md#5-文字の段階 */
export const TEXT = {
  micro: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    lineHeight: 1.6,
    letterSpacing: "0.14em",
    /* why: guide のマイクロラベルの型。和文には効かないので外す必要がない */
    textTransform: "uppercase",
  },
  /* why: 行送りだけ code より広い。番号が肢の 1 行目に寄る */
  numeral: { fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.9 },
  code: { fontFamily: "var(--font-mono)", fontSize: "0.8rem", lineHeight: 1.75 },
  annotation: { fontSize: "0.875rem", lineHeight: 1.75 },
  prose: { fontSize: "1rem", lineHeight: 1.75 },
  syntax: { fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 600, lineHeight: 1.9 },
  titleProse: { fontFamily: "var(--font-serif)", fontSize: "1.125rem", lineHeight: 1.75 },
  title: { fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 600, lineHeight: 1.5 },
  display: {
    fontFamily: "var(--font-serif)",
    fontSize: "1.9rem",
    fontWeight: 900,
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
} as const;

export type TextTone = keyof typeof TONES;

export type TextProps = {
  variant: TextVariant;
  as?: "span" | "p" | "div" | "code" | "h1" | "h2" | "h3";
  tone?: TextTone;
  children: ReactNode;
};

/* why: className を受け取らない。受け取れる口を作ると、そこから見た目の値が再び散る */
export const Text = ({ variant, as: Tag = "span", tone, children }: TextProps) => (
  <Tag
    style={{
      /* why: h1 / h2 / p のブラウザ既定 margin を毎回消さずに済ませる。
         間隔は載せる側が gap で決める */
      margin: 0,
      ...TEXT[variant],
      /* why: tone を渡さないかぎり color を書かない。インライン style は CSS Modules に
         勝つので、常に書くと親の状態で色を変える規則が効かなくなる */
      ...(tone === undefined ? {} : { color: TONES[tone] }),
    }}
  >
    {children}
  </Tag>
);
