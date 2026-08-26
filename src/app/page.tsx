"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, CreditCard, ArrowUpRight, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { DonutChart } from "@/components/charts/DonutChart";
import { useCountUp } from "@/hooks/useCountUp";
import {
  CATEGORIES,
  EXPENSES,
  INCOMES,
  INSTALLMENT_PURCHASES,
  CURRENT_MONTH,
  CURRENT_CCL,
  getCategoryById,
} from "@/lib/mock-data";

// Category expense breakdown for donut
const categoryData = CATEGORIES.filter((c) => c.type === "expense").map((cat) => ({
  name: cat.name,
  emoji: cat.emoji,
  color: cat.color,
  value: EXPENSES.filter(
    (e) => e.category_id === cat.id && e.date.startsWith("2026-08")
  ).reduce((s, e) => s + e.amount_ars, 0),
})).filter((d) => d.value > 0);

// Recent 5 transactions (both incomes and expenses, August)
const recentTransactions = [
  ...EXPENSES.filter((e) => e.date.startsWith("2026-08")).map((e) => ({
    ...e,
    kind: "expense" as const,
  })),
  ...INCOMES.filter((i) => i.date.startsWith("2026-08")).map((i) => ({
    ...i,
    kind: "income" as const,
  })),
]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5);

function AnimatedNumber({ value, prefix = "$", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const count = useCountUp(value);
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(count);
  return <span>{prefix}{formatted}</span>;
}

function StatCard({
  label,
  value,
  usdValue,
  icon,
  iconBg,
  iconColor,
  accentColor,
}: {
  label: string;
  value: number;
  usdValue: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accentColor?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: hovered
          ? `2px solid ${accentColor ?? "var(--accent-green)"}`
          : "2px solid transparent",
        borderRadius: "12px",
        padding: "20px",
        transition: "border-left-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: hovered
          ? `0 0 20px ${accentColor ?? "var(--accent-green)"}18`
          : "none",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div
          style={{
            width: "32px",
            height: "32px",
            background: iconBg,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      </div>
      <p style={{
        fontSize: "24px",
        fontWeight: "800",
        color: accentColor ?? "var(--text-primary)",
        letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
      }}>
        $<AnimatedNumber value={value} prefix="" />
      </p>
      <p style={{ fontSize: "13px", color: accentColor === "var(--accent-blue)" ? "var(--accent-blue)" : "var(--accent-blue)", marginTop: "6px", fontWeight: 500 }}>
        u$d {Math.round(usdValue).toLocaleString("es-AR")}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { ingresos_ars, gastos_ars, cuotas_ars, saldo_ars, budget_ars } = CURRENT_MONTH;
  const budgetUsed = gastos_ars + cuotas_ars;
  const budgetPct = Math.round((budgetUsed / budget_ars) * 100);
  const budgetRemaining = budget_ars - budgetUsed;

  const saldo_usd = saldo_ars / CURRENT_CCL;
  const ingresos_usd = ingresos_ars / CURRENT_CCL;
  const gastos_usd = gastos_ars / CURRENT_CCL;
  const cuotas_usd = cuotas_ars / CURRENT_CCL;

  const budgetGradient =
    budgetPct < 60
      ? "linear-gradient(90deg, #00e87a, #00e87a)"
      : budgetPct < 85
      ? "linear-gradient(90deg, #00e87a 0%, #f59e0b 100%)"
      : "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";

  const budgetColor =
    budgetPct < 60 ? "var(--accent-green)" : budgetPct < 85 ? "var(--warning)" : "var(--error)";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "0",
        maxWidth: "1200px",
        animation: "fadeIn 0.4s ease-out",
      }}
      className="mx-auto"
    >
      {/* ─── HERO ─── Full-bleed asymmetric section */}
      <div
        style={{
          position: "relative",
          padding: "40px 32px 36px",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          marginBottom: "0",
        }}
      >
        {/* Radial glow behind the number */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "30%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(0,232,122,0.08) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* Asymmetric layout: 60% left / 40% right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          {/* Left 60%: the number + metadata */}
          <div style={{ flex: "0 0 60%", position: "relative", zIndex: 1 }}>
            {/* Label */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}>
                SALDO AGOSTO
              </p>
              {/* Thin accent line */}
              <div style={{
                marginTop: "6px",
                height: "2px",
                width: "48px",
                background: "linear-gradient(90deg, #00e87a, transparent)",
                borderRadius: "1px",
              }} />
            </div>

            {/* The big number — 88px */}
            <div
              style={{
                fontSize: "clamp(56px, 7vw, 88px)",
                fontWeight: "800",
                color: saldo_ars >= 0 ? "var(--text-primary)" : "var(--error)",
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mounted ? (
                <AnimatedNumber value={saldo_ars} prefix="$" />
              ) : (
                `$${new Intl.NumberFormat("es-AR").format(saldo_ars)}`
              )}
            </div>

            {/* USD equivalent at 28px */}
            <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "var(--accent-blue)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                u$d {Math.round(saldo_usd).toLocaleString("es-AR")}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--accent-green)",
                  background: "rgba(0, 232, 122, 0.1)",
                  padding: "4px 12px",
                  borderRadius: "100px",
                }}
              >
                <ArrowUp size={12} />
                +$198k vs julio
              </span>
            </div>

            {/* CCL */}
            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                CCL hoy:
              </span>
              <span style={{ fontSize: "14px", color: "var(--accent-blue)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ${new Intl.NumberFormat("es-AR").format(CURRENT_CCL)}
              </span>
            </div>
          </div>

          {/* Right 40%: donut chart floating, no card wrapper */}
          <div
            style={{
              flex: "0 0 40%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <DonutChart data={categoryData} size={220} />
          </div>
        </div>
      </div>

      {/* ─── BUDGET BAR ─── Standalone section, no card wrapper */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
            Gastaste{" "}
            <span style={{ color: budgetColor, fontWeight: "700" }}>
              ${new Intl.NumberFormat("es-AR").format(budgetUsed)}
            </span>
            {" "}de{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              ${new Intl.NumberFormat("es-AR").format(budget_ars)}
            </span>
            {" "}({budgetPct}%)
          </span>
          <span style={{ fontSize: "13px", color: budgetRemaining > 0 ? "var(--accent-green)" : "var(--error)", fontWeight: "700" }}>
            {budgetRemaining > 0
              ? `Quedan $${new Intl.NumberFormat("es-AR").format(budgetRemaining)}`
              : `Excedido $${new Intl.NumberFormat("es-AR").format(Math.abs(budgetRemaining))}`}
          </span>
        </div>

        {/* Progress bar — 6px, gradient */}
        <div
          style={{
            background: "var(--border)",
            borderRadius: "3px",
            height: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(budgetPct, 100)}%`,
              background: budgetGradient,
              borderRadius: "3px",
              transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>

      {/* Main content padding container */}
      <div style={{ padding: "28px 32px" }}>
        {/* ─── 3 STAT CARDS ─── dynamic grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "14px",
            marginBottom: "28px",
          }}
          className="grid-cols-1 sm:grid-cols-3"
        >
          <StatCard
            label="Ingresos"
            value={ingresos_ars}
            usdValue={ingresos_usd}
            icon={<TrendingUp size={16} color="var(--accent-green)" />}
            iconBg="rgba(0, 232, 122, 0.12)"
            iconColor="var(--accent-green)"
          />
          <StatCard
            label="Gastos"
            value={gastos_ars}
            usdValue={gastos_usd}
            icon={<TrendingDown size={16} color="var(--error)" />}
            iconBg="rgba(239, 68, 68, 0.12)"
            iconColor="var(--error)"
          />
          <StatCard
            label="Cuotas"
            value={cuotas_ars}
            usdValue={cuotas_usd}
            icon={<CreditCard size={16} color="var(--accent-blue)" />}
            iconBg="rgba(14, 165, 233, 0.12)"
            iconColor="var(--accent-blue)"
            accentColor="var(--accent-blue)"
          />
        </div>

        {/* ─── Category breakdown + Recent transactions ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "20px",
          }}
          className="lg:grid-cols-[1fr,1fr]"
        >
          {/* Category legend */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h2 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "18px", color: "var(--text-primary)" }}>
              Gastos por categoría
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {categoryData.sort((a, b) => b.value - a.value).map((cat) => {
                const total = categoryData.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                return (
                  <div key={cat.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>{cat.emoji}</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{cat.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                          ${new Intl.NumberFormat("es-AR").format(cat.value)}
                        </span>
                      </div>
                    </div>
                    {/* 6px bar, matching budget bar */}
                    <div style={{ background: "var(--border)", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: cat.color,
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent transactions */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                Últimas transacciones
              </h2>
              <a
                href="/gastos"
                style={{
                  fontSize: "12px",
                  color: "var(--accent-green)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: 600,
                }}
              >
                Ver todas <ArrowUpRight size={12} />
              </a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {recentTransactions.map((tx, i) => {
                const cat = getCategoryById(tx.category_id);
                const isLast = i === recentTransactions.length - 1;
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 0",
                      borderBottom: isLast ? "none" : "1px solid #1d1d1d",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: cat ? `${cat.color}1a` : "#252525",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {cat?.emoji ?? "📦"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tx.detail}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {cat?.name} · {new Date(tx.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: tx.kind === "income" ? "var(--accent-green)" : "var(--text-primary)",
                          letterSpacing: "-0.01em",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {tx.kind === "income" ? "+" : "−"}${new Intl.NumberFormat("es-AR").format(tx.amount_ars)}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "2px" }}>
                        {tx.kind === "income" ? (
                          <ArrowUp size={10} color="var(--accent-green)" />
                        ) : (
                          <ArrowDown size={10} color="var(--text-muted)" />
                        )}
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                          u$d {tx.amount_usd < 10 ? tx.amount_usd.toFixed(1) : Math.round(tx.amount_usd).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <a
        href="/gastos"
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: "80px",
          right: "20px",
          width: "56px",
          height: "56px",
          background: "var(--accent-green)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0, 232, 122, 0.4)",
          textDecoration: "none",
          zIndex: 40,
        }}
      >
        <Plus size={24} color="#0f0f0f" strokeWidth={2.5} />
      </a>
    </div>
  );
}
