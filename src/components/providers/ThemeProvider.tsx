"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: {
  children: ReactNode;
  attribute?: "class" | "data-theme";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) setThemeState(stored);
    else if (enableSystem) setThemeState("system");
  }, [enableSystem]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    let resolved: "light" | "dark" = "light";

    const apply = () => {
      if (theme === "system") resolved = mql.matches ? "dark" : "light";
      else resolved = theme;

      setResolvedTheme(resolved);
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      if (disableTransitionOnChange) {
        root.style.transition = "none";
        requestAnimationFrame(() => { root.style.transition = ""; });
      }
      localStorage.setItem("theme", theme);
    };

    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme, mounted, disableTransitionOnChange]);

  const setTheme = (t: Theme) => setThemeState(t);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}