import { useEffect, useState } from "react";

import type { Theme } from "../view/atoms/ThemeToggle/ThemeToggle";

const KEY = "cypher-quiz:theme";

const QUERY = "(prefers-color-scheme: dark)";

const osTheme = (): Theme => (window.matchMedia(QUERY).matches ? "dark" : "light");

const storedTheme = (): Theme | undefined => {
  const value = window.localStorage.getItem(KEY);

  return value === "light" || value === "dark" ? value : undefined;
};

export const useTheme = (): [Theme, () => void] => {
  const [choice, setChoice] = useState<Theme | undefined>(storedTheme);
  const [os, setOs] = useState<Theme>(osTheme);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setOs(media.matches ? "dark" : "light");

    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (choice === undefined) {
      delete document.documentElement.dataset.theme;
      window.localStorage.removeItem(KEY);

      return;
    }

    document.documentElement.dataset.theme = choice;
    window.localStorage.setItem(KEY, choice);
  }, [choice]);

  const theme = choice ?? os;

  return [theme, () => setChoice(theme === "light" ? "dark" : "light")];
};
