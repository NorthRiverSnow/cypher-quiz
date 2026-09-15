import type { CSSProperties, ReactNode } from "react";

import { TEXT, Text } from "../Text/Text";

export type CardProps = {
  children: ReactNode;
  /** 上辺の罫線を切って重ねる見出し。渡さなければ罫線を切らない */
  label?: string;
};

const CARD: CSSProperties = {
  padding: "var(--space-lg)",
  border: "var(--border-width) solid var(--rule)",
  borderRadius: "var(--radius-card)",
  background: "var(--panel)",
  boxShadow: "var(--shadow)",
};

/* why: legend は上辺の罫線の上に、高さの半分だけはみ出して乗る。上の余白をそのままにすると
   罫線から中身までが左右より広くなる */
const LEGEND_HALF = `calc(${TEXT.annotation.fontSize} * ${TEXT.annotation.lineHeight} / 2)`;

/* why: fieldset は既定で min-width: min-content を持ち、grid や flex の中で
   中身より狭くならない。margin も既定で付く */
const LABELLED: CSSProperties = {
  ...CARD,
  paddingBlockStart: `calc(var(--space-lg) - ${LEGEND_HALF})`,
  minWidth: 0,
  margin: 0,
};

/* why: legend が罫線を切る幅は、この要素の幅そのもの。左右の padding が切れ目の余白になる */
const LEGEND: CSSProperties = { padding: "0 var(--space-xs)" };

/* why: article にしない。自己完結した単位として読み上げるかは中身が決める */
export const Card = ({ children, label }: CardProps) =>
  label === undefined ? (
    <div style={CARD}>{children}</div>
  ) : (
    /* why: fieldset と legend を使う。罫線の切れ目はブラウザが作るので、
       ラベルの背面に面を敷いて隠さずに済む——外側の面が何色でも合う */
    <fieldset style={LABELLED}>
      <legend style={LEGEND}>
        <Text variant="annotation" tone="soft">
          {label}
        </Text>
      </legend>
      {children}
    </fieldset>
  );
