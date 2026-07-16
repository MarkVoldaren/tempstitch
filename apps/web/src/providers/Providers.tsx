"use client";

import type { PropsWithChildren } from "react";

import { AppDataProvider } from "./AppDataProvider";
import { AuthProvider } from "./AuthProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppDataProvider>{children}</AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
