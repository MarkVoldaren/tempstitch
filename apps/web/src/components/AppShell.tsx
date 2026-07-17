"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

const navItems = [
  { href: "/app/projects", label: "Projects", mark: "P" },
  { href: "/app/projects/new", label: "New Project", mark: "+" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const { configured, user, signOut } = useAuth();
  const { mode, setMode } = useTheme();

  const projectId = params?.id;
  const projectNav = projectId ? [
    { href: `/app/projects/${projectId}/preview`, label: "Preview", mark: "V" },
    { href: `/app/projects/${projectId}/build`, label: "Build", mark: "B" },
    { href: `/app/projects/${projectId}/colors`, label: "Colors", mark: "C" },
    { href: `/app/projects/${projectId}/settings`, label: "Settings", mark: "S" },
  ] : [];

  return (
    <div className="shell">
      <header className="mobileHeader"><Link className="mobileBrand" href="/app/projects"><span className="brandMark" aria-hidden="true">TS</span><span><small>StitchForecast</small><strong>Temp Stitch</strong></span></Link><Link className="primaryButton compact" href="/app/projects/new">New project</Link></header>
      <aside className="sidebar">
        <div className="sidebarBrand">
          <span className="brandMark" aria-hidden="true">TS</span>
          <div><p className="eyebrow">StitchForecast</p>
          <h1 className="sidebarTitle">Temp Stitch</h1></div>
          <p className="sidebarCopy">
            A calm studio for weather-driven blankets.
          </p>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={(item.href === "/app/projects" ? pathname === item.href : pathname.startsWith(item.href)) ? "navLink active" : "navLink"}
              href={item.href}
            >
              <span className="navMark" aria-hidden="true">{item.mark}</span>{item.label}
            </Link>
          ))}
          {projectNav.length ? <div className="navDivider" /> : null}
          {projectNav.map((item) => <Link key={item.href} className={pathname === item.href ? "navLink active" : "navLink"} href={item.href}><span className="navMark" aria-hidden="true">{item.mark}</span>{item.label}</Link>)}
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
          <p className="metaText">{configured ? user?.email ?? "Signed out" : "Local data"}</p>
          {configured ? (
            <button className="ghostButton" onClick={() => void signOut()} type="button">
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <main className="mainContent">{children}</main>
      <nav className="bottomNav" aria-label="Primary navigation"><Link className={pathname === "/app/projects" ? "active" : ""} href="/app/projects"><span>P</span>Projects</Link>{projectNav.slice(0, 3).map((item) => <Link className={pathname === item.href ? "active" : ""} key={item.href} href={item.href}><span>{item.mark}</span>{item.label}</Link>)}{!projectId ? <Link className={pathname === "/app/projects/new" ? "active" : ""} href="/app/projects/new"><span>+</span>New</Link> : null}</nav>
    </div>
  );
}
