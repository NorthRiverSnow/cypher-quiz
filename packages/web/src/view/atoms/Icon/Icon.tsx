/* why: ligature 名（"warning"）で書くとフォント到着前に文字列が見えるため、コードポイントで持つ */
export const ICONS = {
  warning: "\uf083",
  info: "\ue88e",
  radio_button_unchecked: "\ue836",
  close: "\ue5cd",
  play_arrow: "\ue037",
  restart_alt: "\uf053",
  light_mode: "\ue518",
  dark_mode: "\ue51c",
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  label?: string;
  size?: string;
  color?: string;
  fill?: 0 | 1;
};

export const Icon = ({
  name,
  label,
  size = "1.25rem",
  color = "currentColor",
  fill = 0,
}: IconProps) => (
  <span
    role={label === undefined ? undefined : "img"}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
    style={{
      fontFamily: "var(--font-icon)",
      /* why: opsz は描画 px に合わせる軸。本文脇の 20px 相当に固定している */
      fontVariationSettings: `"FILL" ${fill}, "opsz" 20`,
      fontWeight: "var(--weight-medium)",
      fontSize: size,
      lineHeight: 1,
      color,
    }}
  >
    {ICONS[name]}
  </span>
);
