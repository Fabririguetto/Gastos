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

  const budgetColor =
    budgetPct < 60 ? "var(--accent-green)" : budgetPct < 85 ? "var(--warning)" : "var(--error)";

  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 24px",
        maxWidth: "1200px",
        animation: "fadeIn 0.4s ease-out",
      }}
      className="mx-auto"
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Agosto 2026
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginTop: "4px", letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
      </div>

      {/* Hero Section */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "32px",
          marginBottom: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background accent */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: "240px",
            height: "240px",
            background: "radial-gradient(circle, rgba(0,232,122,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
          {/* Left: Saldo */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
              Saldo del mes
            </p>

            <div
              style={{
                fontSize: "clamp(40px, 5vw, 60px)",
                fontWeight: "800",
                color: saldo_ars >= 0 ? "var(--text-primary)" : "var(--error)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mounted ? (
                <AnimatedNumber value={saldo_ars} prefix="$" />
              ) : (
                `$${new Intl.NumberFormat("es-AR").format(saldo_ars)}`
              )}
            </div>

            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "var(--accent-blue)",
                  letterSpacing: "-0.02em",
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
                  padding: "3px 10px",
                  borderRadius: "100px",
                }}
              >
                <ArrowUp size={12} />
                +$198k vs mes anterior
              </span>
            </div>

            {/* CCL rate pill */}
            <div style={{ marginTop: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                CCL hoy:{" "}
                <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                  $1.548
                </span>
              </span>
            </div>
          </div>

          {/* Right: Donut chart */}
          <div style={{ flexShrink: 0 }}>
            <DonutChart data={categoryData} size={160} />
          </div>
        </div>
      </div>

      {/* Budget Bar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
            Presupuesto mensual
          </span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            ${new Intl.NumberFormat("es-AR").format(budget_ars)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            background: "var(--border)",
            borderRadius: "4px",
            height: "8px",
            overflow: "hidden",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(budgetPct, 100)}%`,
              background: budgetColor,
              borderRadius: "4px",
              transition: "width 0.8s ease-out",
              boxShadow: `0 0 12px ${budgetColor}40`,
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)" }}>
            Gastaste{" "}
            <span style={{ color: budgetColor, fontWeight: "600" }}>
              ${new Intl.NumberFormat("es-AR").format(budgetUsed)}
            </span>
            {" "}({budgetPct}%)
          </span>
          <span style={{ color: budgetRemaining > 0 ? "var(--accent-green)" : "var(--error)", fontWeight: "600" }}>
            {budgetRemaining > 0
              ? `Te quedan $${new Intl.NumberFormat("es-AR").format(budgetRemaining)}`
              : `Te pasaste $${new Intl.NumberFormat("es-AR").format(Math.abs(budgetRemaining))}`}
          </span>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Ingresos */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Ingresos
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(0, 232, 122, 0.12)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={16} color="var(--accent-green)" />
            </div>
          </div>
          <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            $<AnimatedNumber value={ingresos_ars} prefix="" />
          </p>
          <p style={{ fontSize: "13px", color: "var(--accent-blue)", marginTop: "4px", fontWeight: 500 }}>
            u$d {Math.round(ingresos_usd).toLocaleString("es-AR")}
          </p>
        </div>

        {/* Gastos */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gastos
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(239, 68, 68, 0.12)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingDown size={16} color="var(--error)" />
            </div>
          </div>
          <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            $<AnimatedNumber value={gastos_ars} prefix="" />
          </p>
          <p style={{ fontSize: "13px", color: "var(--accent-blue)", marginTop: "4px", fontWeight: 500 }}>
            u$d {Math.round(gastos_usd).toLocaleString("es-AR")}
          </p>
        </div>

        {/* Cuotas */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Cuotas
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(14, 165, 233, 0.12)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={16} color="var(--accent-blue)" />
            </div>
          </div>
          <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            $<AnimatedNumber value={CURRENT_MONTH.cuotas_ars} prefix="" />
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {INSTALLMENT_PURCHASES.filter((i) => i.paid_installments < i.total_installments).length} activas
          </p>
        </div>
      </div>

      {/* Category breakdown + Recent transactions */}
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
          <h2 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "var(--text-primary)" }}>
            Gastos por categoría
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {categoryData.sort((a, b) => b.value - a.value).map((cat) => {
              const total = categoryData.reduce((s, c) => s + c.value, 0);
              const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{cat.emoji}</span>
                      <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{cat.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{pct}%</span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                        ${new Intl.NumberFormat("es-AR").format(cat.value)}
                      </span>
                    </div>
                  </div>
                  <div style={{ background: "var(--border)", borderRadius: "2px", height: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: cat.color,
                        borderRadius: "2px",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
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
                fontWeight: 500,
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
                  {/* Icon */}
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

                  {/* Detail */}
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

                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: tx.kind === "income" ? "var(--accent-green)" : "var(--text-primary)",
                        letterSpacing: "-0.01em",
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
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
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
