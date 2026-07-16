"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

const navItems = [
  { href: "/app/projects", label: "Projects" },
  { href: "/app/projects/new", label: "New Project" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { configured, user, signOut } = useAuth();
  const { mode, setMode } = useTheme();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">StitchForecast</p>
          <h1 className="sidebarTitle">Temperature Blanket Studio</h1>
          <p className="sidebarCopy">
            Build blankets with weather-driven yarn planning, row tracking, and color
            guidance.
          </p>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={pathname.startsWith(item.href) ? "navLink active" : "navLink"}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebarFooter">
          <div className="themeRow">
            <button className={mode === "system" ? "chip active" : "chip"} onClick={() => setMode("system")} type="button">
              System
            </button>
            <button className={mode === "light" ? "chip active" : "chip"} onClick={() => setMode("light")} type="button">
              Light
            </button>
            <button className={mode === "dark" ? "chip active" : "chip"} onClick={() => setMode("dark")} type="button">
              Dark
            </button>
          </div>
          <p className="metaText">{configured ? user?.email ?? "Signed out" : "Demo mode"}</p>
          {configured ? (
            <button className="ghostButton" onClick={() => void signOut()} type="button">
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="mainContent">{children}</main>
    </div>
  );
}
