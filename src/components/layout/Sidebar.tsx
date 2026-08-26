"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gastos", label: "Gastos", icon: TrendingDown },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
  { href: "/cuotas", label: "Cuotas", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/configuracion", label: "Config", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "220px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "var(--accent-green)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            $
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Gastos
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: isActive ? "600" : "400",
                    color: isActive ? "var(--accent-green)" : "var(--text-muted)",
                    background: isActive ? "rgba(0, 232, 122, 0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--accent-green)" : "2px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px 0",
          borderTop: "1px solid var(--border)",
          marginTop: "16px",
        }}
      >
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          CCL hoy
        </p>
        <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-blue)", marginTop: "2px" }}>
          $1.548
        </p>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              color: isActive ? "var(--accent-green)" : "var(--text-muted)",
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: "10px", fontWeight: isActive ? "600" : "400" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
