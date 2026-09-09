import type { ReactNode } from "react";

import { Icon, type IconName } from "../../atoms/Icon/Icon";
import { TEXT, Text } from "../../atoms/Text/Text";

const TONES = {
  warn: { fg: "--warn", bg: "--warn-bg" },
  keep: { fg: "--keep", bg: "--keep-bg" },
  alarm: { fg: "--alarm", bg: "--alarm-bg" },
  accent: { fg: "--accent", bg: "--accent-bg" },
} as const;

export type NoteTone = keyof typeof TONES;

export type NoteProps = {
  tone: NoteTone;
  icon?: IconName;
  iconLabel?: string;
  /** 本文の右端に置く操作。閉じるボタンなど */
  action?: ReactNode;
  children: ReactNode;
};

/* 揃え方と実測値は docs/07_design.md#注記のアイコンの位置 */
const ICON_SHIFT = "translateY(0.29rem)";

const LINE_BOX = `calc(${TEXT.annotation.fontSize} * ${TEXT.annotation.lineHeight})`;

export const Note = ({ tone, icon, iconLabel, action, children }: NoteProps) => {
  const { fg, bg } = TONES[tone];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-xs)",
        background: `var(${bg})`,
        borderLeft: `var(--border-width-bold) solid var(${fg})`,
        padding: "var(--space-xs) var(--space-sm)",
      }}
    >
      {icon !== undefined && (
        <span style={{ flex: "none", transform: ICON_SHIFT }}>
          <Icon name={icon} label={iconLabel} color={`var(${fg})`} />
        </span>
      )}
      <span style={{ flex: 1 }}>
        <Text variant="annotation" tone="soft">
          {children}
        </Text>
      </span>
      {action !== undefined && (
        <span style={{ flex: "none", display: "grid", placeItems: "center", height: LINE_BOX }}>
          {action}
        </span>
      )}
    </div>
  );
};
