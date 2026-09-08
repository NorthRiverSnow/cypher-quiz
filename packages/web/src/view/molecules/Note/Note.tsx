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
  children: ReactNode;
};

/* why: アイコンの箱を本文の 1 行と同じ高さにする。em ではなく段階表から計算するのは、
   箱が Text の外にあり、em が本文ではなく親（body）の字の大きさで解決されるため */
const ICON_BOX = `calc(${TEXT.annotation.fontSize} * ${TEXT.annotation.lineHeight})`;

export const Note = ({ tone, icon, iconLabel, children }: NoteProps) => {
  const { fg, bg } = TONES[tone];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-xs)",
        background: `var(${bg})`,
        borderLeft: `var(--border-width-bold) solid var(${fg})`,
        padding: "var(--space-xs) var(--space-sm)",
      }}
    >
      {/* why: 本文の行box と同じ高さの箱に入れて中央寄せすると、1 行目に揃いつつ
          折り返しの字下げが保たれる。margin で押し下げると字の大きさ変更で崩れる */}
      {icon !== undefined && (
        <span style={{ flex: "none", display: "grid", placeItems: "center", height: ICON_BOX }}>
          <Icon name={icon} label={iconLabel} color={`var(${fg})`} />
        </span>
      )}
      <Text variant="annotation" tone="soft">
        {children}
      </Text>
    </div>
  );
};
