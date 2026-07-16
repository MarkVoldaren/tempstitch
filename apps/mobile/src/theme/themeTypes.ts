import { type ViewStyle } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

export type ThemeColors = {
  background: string;
  backgroundMuted: string;
  card: string;
  cardMuted: string;
  cardElevated: string;
  input: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textOnDanger: string;
  textOnInverse: string;
  border: string;
  borderSoft: string;
  divider: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  backdrop: string;
  shadow: string;
  focusRing: string;
  toastBackground: string;
  toastBorder: string;
  liveChip: string;
  cachedChip: string;
  mockChip: string;
  demoChip: string;
  yarnOutline: string;
  inputPlaceholder: string;
};

export type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type ThemeRadii = {
  sm: number;
  md: number;
  lg: number;
  pill: number;
};

export type ThemeShadows = {
  card: ViewStyle;
  floating: ViewStyle;
};

export type AppTheme = {
  dark: boolean;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  statusBarStyle: "light" | "dark";
};
