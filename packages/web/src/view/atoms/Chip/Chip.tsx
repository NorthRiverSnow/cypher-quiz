import type { CSSProperties, ReactNode } from "react";

import { Text } from "../Text/Text";

export type ChipKind = "team" | "engineer" | "service" | "incident";

export type ChipProps = { kind: ChipKind; children: ReactNode };

const CHIP: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "var(--space-2xs) var(--space-xs)",
  /* why: 色を書かない。currentColor になるので、下の color 1 つで文字と罫線が揃う */
  border: "var(--border-width) solid",
  borderRadius: "var(--radius-pill)",
};

export const Chip = ({ kind, children }: ChipProps) => (
  <span style={{ ...CHIP, color: `var(--${kind})` }}>
    {/* why: tone を渡さない。渡すと親の色を上書きして kind が効かなくなる */}
    <Text variant="micro">{children}</Text>
  </span>
);
