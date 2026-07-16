import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { darkTheme } from "./darkTheme";
import { lightTheme } from "./lightTheme";
import { AppTheme, ThemeMode } from "./themeTypes";

const THEME_MODE_STORAGE_KEY = "temperature-blanket:theme-mode";

type ThemeContextValue = {
  currentTheme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let cancelled = false;

    async function loadThemeMode() {
      try {
        const stored = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
        if (!cancelled && (stored === "light" || stored === "dark" || stored === "system")) {
          setThemeModeState(stored);
        }
      } catch {
        if (!cancelled) {
          setThemeModeState("system");
        }
      }
    }

    void loadThemeMode();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedMode = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  const currentTheme = resolvedMode === "dark" ? darkTheme : lightTheme;

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch {
      // Ignore persistence failures and keep the in-memory preference.
    }
  }, []);

  const value = useMemo(
    () => ({
      currentTheme,
      themeMode,
      setThemeMode,
    }),
    [currentTheme, setThemeMode, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider.");
  }

  return context;
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T) {
  const { currentTheme } = useAppTheme();
  return useMemo(() => factory(currentTheme), [currentTheme, factory]);
}
