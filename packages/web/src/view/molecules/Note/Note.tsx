import type { ReactNode } from "react";

import { Icon, type IconName } from "../../atoms/Icon/Icon";

const LINE_HEIGHT = 1.75;

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

export const Note = ({ tone, icon, iconLabel, children }: NoteProps) => {
  const { fg, bg } = TONES[tone];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.35rem",
        fontSize: "0.86rem",
        lineHeight: LINE_HEIGHT,
        /* why: 淡い面に自色を載せると light で AA に届かない（4.18）。本文は --ink-soft に固定する */
        color: "var(--ink-soft)",
        background: `var(${bg})`,
        borderLeft: `2px solid var(${fg})`,
        padding: "0.5rem 0.7rem",
      }}
    >
      {/* why: 本文の行box と同じ高さの箱に入れて中央寄せすると、1 行目に揃いつつ
          折り返しの字下げが保たれる。margin で押し下げると font-size 変更で崩れる */}
      {icon !== undefined && (
        <span
          style={{
            flex: "none",
            display: "grid",
            placeItems: "center",
            height: `${LINE_HEIGHT}em`,
          }}
        >
          <Icon name={icon} label={iconLabel} color={`var(${fg})`} />
        </span>
      )}
      <span>{children}</span>
    </div>
  );
};
