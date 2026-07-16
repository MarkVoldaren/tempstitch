import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "@/navigation/AppNavigator";
import { AppStoreProvider } from "@/store/AppStore";
import { ThemeProvider, useAppTheme } from "@/theme";

function AppShell() {
  const { currentTheme } = useAppTheme();

  const navigationTheme = useMemo(
    () => ({
      ...(currentTheme.dark ? DarkTheme : DefaultTheme),
      colors: {
        ...(currentTheme.dark ? DarkTheme.colors : DefaultTheme.colors),
        background: currentTheme.colors.background,
        card: currentTheme.colors.card,
        primary: currentTheme.colors.accent,
        text: currentTheme.colors.textPrimary,
        border: currentTheme.colors.border,
        notification: currentTheme.colors.error,
      },
    }),
    [currentTheme],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={currentTheme.statusBarStyle} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStoreProvider>
          <AppShell />
        </AppStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
