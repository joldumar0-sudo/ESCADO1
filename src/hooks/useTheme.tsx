import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";
const KEY = "app-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "light";
    setThemeState(stored);
    apply(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
    apply(t);
  }, []);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
