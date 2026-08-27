"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { CURRENT_CCL } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";

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
  const router = useRouter();

  const handleLogout = async () => {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
        minHeight: "100%",
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <circle cx="16" cy="16" r="16" fill="#00e87a" />
            <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="800"
              fontFamily="system-ui, sans-serif" fill="#0f0f0f" letterSpacing="-1">G</text>
          </svg>
          <span style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--text-primary)" }}>gas</span>
            <span style={{ color: "var(--accent-green)" }}>tos</span>
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
      <div style={{ padding: "16px 20px 0", borderTop: "1px solid var(--border)", marginTop: "16px" }}>
        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>CCL hoy</p>
        <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-blue)", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
          ${new Intl.NumberFormat("es-AR").format(CURRENT_CCL)}
        </p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "8px 10px",
            borderRadius: "7px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-muted)",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--error)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
            e.currentTarget.style.background = "rgba(239,68,68,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={14} />
          Cerrar sesión
        </button>
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
