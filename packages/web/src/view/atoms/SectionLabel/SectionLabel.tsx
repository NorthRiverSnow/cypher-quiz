import type { CSSProperties, ReactNode } from "react";

import { Text } from "../Text/Text";

export type SectionLabelProps = { children: ReactNode };

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "var(--space-sm)",
  alignItems: "center",
};

const RULE: CSSProperties = { height: "var(--border-width)", background: "var(--rule-soft)" };

/* why: `§` を持たせる。呼ぶ側に任せると付け忘れた章ラベルが混ざる */
export const SectionLabel = ({ children }: SectionLabelProps) => (
  <div style={ROW}>
    <Text variant="micro" tone="muted">
      § {children}
    </Text>
    <span style={RULE} aria-hidden />
  </div>
);
