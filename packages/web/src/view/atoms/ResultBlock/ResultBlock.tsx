import type { CSSProperties, ReactNode } from "react";

import { Text } from "../Text/Text";

export type ResultBlockProps = { children: ReactNode };

const BLOCK: CSSProperties = {
  borderLeft: "var(--border-width-bold) solid var(--keep)",
  padding: "var(--space-2xs) 0 var(--space-2xs) var(--space-sm)",
  /* why: 桁を空白で揃えてあるので折り返さない。折り返すと列がずれる。
     white-space は継承されるので、Text ではなくここに置く */
  whiteSpace: "pre",
  overflowX: "auto",
};

/* why: inline だと外側の行box（body の 1.9）が code の 1.75 を上回り、行間が開く */
export const ResultBlock = ({ children }: ResultBlockProps) => (
  <div style={BLOCK}>
    <Text as="div" variant="code" tone="soft">
      {children}
    </Text>
  </div>
);
