import { Icon, type IconName } from "../Icon/Icon";
import styles from "./IconButton.module.css";

export type IconButtonProps = {
  icon: IconName;
  /* 読み上げの名前と、ポインタを載せたときの説明。記号だけでは意味が伝わらない */
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export const IconButton = ({ icon, label, onClick, disabled = false }: IconButtonProps) => (
  <button
    type="button"
    className={styles.button}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    {/* why: 名前はボタンが持つので、アイコンには label を渡さない。二重に読み上げられる */}
    <Icon name={icon} size="1.1rem" />
  </button>
);
