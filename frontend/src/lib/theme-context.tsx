"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

/** User preference stored in localStorage */
export type ThemePreference = "light" | "dark";
/** Actually applied polarity on <html> */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Toggles between light and dark */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "ozonhelper-theme";

const SENTRY = {
  primary: "#150f23",
  inkDeep: "#1f1633",
  surfaceNight: "#150f23",
  surfaceElevated: "#422082",
  accentVioletDeep: "#422082",
  accentVioletMid: "#79628c",
  onPrimary: "#ffffff",
  bodyLight: "#4a4458",
  onDarkMuted: "#bdb8c0",
  hairlineCloud: "#e5e7eb",
  hairlineViolet: "#362d59",
  hairlineCool: "#cfcfdb",
  ringFocus: "rgba(157, 193, 245, 0.5)",
} as const;

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference;
}

export function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Migrate legacy "system" to current OS preference once
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function buildAntdTheme(resolved: ResolvedTheme) {
  const isDark = resolved === "dark";
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: SENTRY.primary,
      colorBgContainer: isDark ? SENTRY.inkDeep : SENTRY.onPrimary,
      colorBgElevated: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
      colorText: isDark ? SENTRY.onPrimary : SENTRY.inkDeep,
      colorTextSecondary: isDark ? SENTRY.onDarkMuted : SENTRY.bodyLight,
      colorBorder: isDark ? SENTRY.hairlineViolet : SENTRY.hairlineCloud,
      colorBorderSecondary: isDark ? SENTRY.hairlineViolet : SENTRY.hairlineCool,
      borderRadius: 8,
      fontFamily: "Rubik, system-ui, sans-serif",
      controlOutline: SENTRY.ringFocus,
    },
    components: {
      Modal: {
        contentBg: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
        headerBg: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
        footerBg: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
      },
      Drawer: {
        colorBgElevated: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
      },
      Select: {
        colorBgContainer: isDark ? SENTRY.surfaceNight : SENTRY.onPrimary,
        colorBgElevated: isDark ? SENTRY.inkDeep : SENTRY.onPrimary,
        colorBorder: isDark ? SENTRY.hairlineViolet : SENTRY.hairlineCool,
        colorText: isDark ? SENTRY.onPrimary : SENTRY.inkDeep,
        colorTextPlaceholder: isDark ? SENTRY.onDarkMuted : SENTRY.bodyLight,
        optionSelectedBg: isDark
          ? "rgba(121, 98, 140, 0.22)"
          : "rgba(21, 15, 35, 0.08)",
        optionActiveBg: isDark
          ? "rgba(255, 255, 255, 0.06)"
          : SENTRY.hairlineCloud,
        controlHeight: 36,
        borderRadius: 6,
        fontSize: 14,
      },
    },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const apply = useCallback((preference: ThemePreference) => {
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  useEffect(() => {
    const stored = readStoredTheme();
    const legacy = localStorage.getItem(THEME_STORAGE_KEY);
    if (legacy === "system") {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
    }
    setThemeState(stored);
    apply(stored);
  }, [apply]);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setThemeState(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      apply(next);
    },
    [apply],
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const antdConfig = useMemo(
    () => buildAntdTheme(resolvedTheme),
    [resolvedTheme],
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={antdConfig}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
