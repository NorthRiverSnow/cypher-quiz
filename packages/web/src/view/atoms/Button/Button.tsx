import type { ReactNode } from "react";

import styles from "./Button.module.css";

export type ButtonProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

/* why: type を props で受けない。フォームがまだ無く、submit の必要が出ていない */
export const Button = ({ children, onClick, disabled = false }: ButtonProps) => (
  <button type="button" className={styles.button} disabled={disabled} onClick={onClick}>
    {children}
  </button>
);
