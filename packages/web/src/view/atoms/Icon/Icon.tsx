/* why: ligature 名（"warning"）で書くとフォント到着前に文字列が見えるため、コードポイントで持つ */
export const ICONS = {
  warning: "\uf083",
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  label?: string;
  size?: string;
  color?: string;
  fill?: 0 | 1;
  weight?: number;
};

export const Icon = ({
  name,
  label,
  size = "1.25rem",
  color = "currentColor",
  fill = 0,
  weight = 500,
}: IconProps) => (
  <span
    role={label === undefined ? undefined : "img"}
    aria-label={label}
    aria-hidden={label === undefined ? true : undefined}
    style={{
      fontFamily: "var(--font-icon)",
      /* why: opsz は描画 px に合わせる軸。本文脇の 20px 相当に固定している */
      fontVariationSettings: `"FILL" ${fill}, "wght" ${weight}, "opsz" 20`,
      fontSize: size,
      lineHeight: 1,
      color,
    }}
  >
    {ICONS[name]}
  </span>
);
