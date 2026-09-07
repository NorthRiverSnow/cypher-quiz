import type { CSSProperties, ReactNode } from "react";

import { TEXT } from "../Text/Text";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "quiet";

const LABEL: CSSProperties = { ...TEXT.annotation };

export type ButtonProps = {
  children: ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

/* why: type を props で受けない。フォームがまだ無く、submit の必要が出ていない */
export const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: ButtonProps) => (
  <button
    type="button"
    style={LABEL}
    className={`${styles.button} ${styles[variant]}`}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
