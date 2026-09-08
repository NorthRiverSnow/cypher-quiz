import { IconButton } from "../IconButton/IconButton";

export type Theme = "light" | "dark";

export type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

const NEXT: Record<Theme, { icon: "light_mode" | "dark_mode"; label: string }> = {
  light: { icon: "dark_mode", label: "dark に切り替える" },
  dark: { icon: "light_mode", label: "light に切り替える" },
};

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const next = NEXT[theme];

  return <IconButton icon={next.icon} label={next.label} onClick={onToggle} />;
};
