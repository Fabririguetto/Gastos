"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, CreditCard, ArrowUpRight, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { DonutChart } from "@/components/charts/DonutChart";
import { useCountUp } from "@/hooks/useCountUp";
import { createClient } from "@/lib/supabase/client";
import { DateRangeFilter, DateRange, currentMonthRange, historicRange } from "@/components/ui/DateRangeFilter";
import type { Category, Card, Expense, Income, InstallmentPurchase } from "@/types/database";

const MONTH_NAMES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getNextMonths(baseKey: string, count: number) {
  const [baseYear, baseMonth] = baseKey.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const totalMonths = baseMonth + i + 1;
    const year = baseYear + Math.floor((totalMonths - 1) / 12);
    const month = ((totalMonths - 1) % 12) + 1;
    const dateKey = `${year}-${String(month).padStart(2, "0")}`;
    return { dateKey, label: `${MONTH_NAMES_SHORT[month - 1]} ${year}` };
  });
}

function computeInstallmentsForMonth(dateKey: string, purchases: InstallmentPurchase[]) {
  const [year, month] = dateKey.split("-").map(Number);
  const byCard: Record<string, number> = {};
  let total = 0;
  for (const p of purchases) {
    const [sy, sm] = p.start_date.split("-").map(Number);
    const monthsFromStart = (year - sy) * 12 + (month - sm);
    if (monthsFromStart >= 0 && monthsFromStart < p.total_installments) {
      const base = Number(p.paid_amount ?? p.total_amount);
      const perInstallment = base / p.total_installments;
      byCard[p.card_id] = (byCard[p.card_id] ?? 0) + perInstallment;
      total += perInstallment;
    }
  }
  return { byCard, total };
}

function AnimatedNumber({ value, prefix = "$", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const count = useCountUp(Math.abs(value));
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(count);
  return <span>{value < 0 ? "−" : ""}{prefix}{formatted}</span>;
}

function StatCard({ label, value, usdValue, icon, iconBg, accentColor }: {
  label: string; value: number; usdValue: number; icon: React.ReactNode; iconBg: string; accentColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: hovered ? `2px solid ${accentColor ?? "var(--accent-green)"}` : "2px solid transparent", borderRadius: "12px", padding: "20px", transition: "border-left-color 0.2s ease, box-shadow 0.2s ease", boxShadow: hovered ? `0 0 20px ${accentColor ?? "var(--accent-green)"}18` : "none", cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <div style={{ width: "32px", height: "32px", background: iconBg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      </div>
      <p style={{ fontSize: "24px", fontWeight: "800", color: accentColor ?? "var(--text-primary)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        $<AnimatedNumber value={value} prefix="" />
      </p>
      <p style={{ fontSize: "13px", color: "var(--accent-blue)", marginTop: "6px", fontWeight: 500 }}>
        u$d {Math.round(usdValue).toLocaleString("es-AR")}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange());

  // Data from Supabase
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [purchases, setPurchases] = useState<InstallmentPurchase[]>([]);
  const [ccl, setCcl] = useState(1548);
  const [loading, setLoading] = useState(true);
  const [budgetArs, setBudgetArs] = useState(0);
  // All-time totals for hero saldo histórico
  const [historicIngresos, setHistoricIngresos] = useState(0);
  const [historicGastos, setHistoricGastos] = useState(0);

  const sb = createClient();

  // Load static data once
  useEffect(() => {
    setMounted(true);
    async function loadStatic() {
      const [catRes, cardRes, purchaseRes, rateRes, settingsRes] = await Promise.all([
        sb.from("categories").select("*"),
        sb.from("cards").select("*").order("name"),
        sb.from("installment_purchases").select("*"),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
        sb.from("settings").select("monthly_budget_ars").maybeSingle(),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (cardRes.data) setCards(cardRes.data);
      if (purchaseRes.data) setPurchases(purchaseRes.data);
      if (rateRes.data) setCcl(Number(rateRes.data.ccl_rate));
      if (settingsRes.data) setBudgetArs(Number(settingsRes.data.monthly_budget_ars) || 0);
    }
    loadStatic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = dateRange;
      const [expRes, incRes, allExpRes, allIncRes] = await Promise.all([
        sb.from("expenses").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        sb.from("incomes").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        sb.from("expenses").select("amount_ars").lte("date", to),
        sb.from("incomes").select("amount_ars").lte("date", to),
      ]);
      if (expRes.data) setExpenses(expRes.data);
      if (incRes.data) setIncomes(incRes.data);
      if (allExpRes.data) setHistoricGastos(allExpRes.data.reduce((s, e) => s + Number(e.amount_ars), 0));
      if (allIncRes.data) setHistoricIngresos(allIncRes.data.reduce((s, i) => s + Number(i.amount_ars), 0));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { loadMonthData(); }, [loadMonthData]);

  // Derive month key from start of range for installment computation
  const selectedMonth = dateRange.from.slice(0, 7);

  // Derived values — filtrados por rango para las stat cards
  const ingresos_ars = incomes.reduce((s, i) => s + Number(i.amount_ars), 0);
  const gastos_ars = expenses.reduce((s, e) => s + Number(e.amount_ars), 0);
  // Solo cuotas que NO descuentan del balance (las que sí descuentan ya están en expenses)
  const { total: cuotas_ars } = computeInstallmentsForMonth(
    selectedMonth,
    purchases.filter((p) => !p.counts_towards_balance)
  );

  // Saldo histórico: total histórico ingresos - total histórico gastos
  const saldo_ars = historicIngresos - historicGastos;
  const saldo_usd = saldo_ars / ccl;

  const ingresos_usd = ingresos_ars / ccl;
  const gastos_usd = gastos_ars / ccl;
  const cuotas_usd = cuotas_ars / ccl;

  // Category breakdown
  const expenseCats = categories.filter((c) => c.type === "expense");
  const categoryData = expenseCats.map((cat) => ({
    name: cat.name,
    emoji: cat.emoji,
    color: cat.color,
    value: expenses.filter((e) => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount_ars), 0),
  })).filter((d) => d.value > 0);

  // Recent transactions
  const recentTransactions = [
    ...expenses.map((e) => ({ ...e, kind: "expense" as const })),
    ...incomes.map((i) => ({ ...i, kind: "income" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const getCat = (id: string) => categories.find((c) => c.id === id);

  // Upcoming cuotas (next 3 months from current)
  const upcomingMonths = getNextMonths(selectedMonth, 3).map(({ dateKey, label }) => ({
    label, ...computeInstallmentsForMonth(dateKey, purchases),
  }));
  const activeCards = cards.filter((c) => upcomingMonths.some((m) => (m.byCard[c.id] ?? 0) > 0));

  // Budget — gastos_ars ya incluye las cuotas que generan expenses
  const budgetEnabled = budgetArs > 0;
  const budgetUsed = gastos_ars;
  const budgetPct = budgetArs > 0 ? Math.round((budgetUsed / budgetArs) * 100) : 0;
  const budgetRemaining = budgetArs - budgetUsed;
  const budgetGradient = budgetPct < 60 ? "linear-gradient(90deg, #00e87a, #00e87a)" : budgetPct < 85 ? "linear-gradient(90deg, #00e87a 0%, #f59e0b 100%)" : "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";
  const budgetColor = budgetPct < 60 ? "var(--accent-green)" : budgetPct < 85 ? "var(--warning)" : "var(--error)";

  return (
    <div style={{ minHeight: "100vh", animation: "fadeIn 0.4s ease-out" }}>

      {/* ─── HERO ─── */}
      <div style={{ padding: "40px 32px", position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
        <div style={{ position: "absolute", top: "50%", left: "30%", transform: "translate(-50%, -50%)", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(0,232,122,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Date range filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <div style={{ height: "1px", flex: 1, background: "linear-gradient(90deg, var(--border), transparent)", minWidth: "20px" }} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          <div style={{ flex: "1", position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                BALANCE
              </p>
              <div style={{ marginTop: "6px", height: "2px", width: "48px", background: "linear-gradient(90deg, #00e87a, transparent)", borderRadius: "1px" }} />
            </div>

            <div style={{ fontSize: "clamp(56px, 7vw, 88px)", fontWeight: "800", color: saldo_ars >= 0 ? "var(--text-primary)" : "var(--error)", letterSpacing: "-0.04em", lineHeight: 0.95, fontVariantNumeric: "tabular-nums" }}>
              {loading ? <span style={{ opacity: 0.3 }}>$—</span> : mounted ? <AnimatedNumber value={saldo_ars} prefix="$" /> : `$${new Intl.NumberFormat("es-AR").format(saldo_ars)}`}
            </div>

            <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--accent-blue)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {loading ? "u$d —" : `u$d ${Math.round(saldo_usd).toLocaleString("es-AR")}`}
              </span>
            </div>

            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>CCL:</span>
              <span style={{ fontSize: "14px", color: "var(--accent-blue)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ${new Intl.NumberFormat("es-AR").format(ccl)}
              </span>
            </div>
          </div>

          <div className="hidden md:flex" style={{ flex: "0 0 40%", justifyContent: "center", alignItems: "center" }}>
            <DonutChart data={categoryData.length > 0 ? categoryData : [{ name: "Sin datos", emoji: "📭", color: "#333", value: 1 }]} size={220} />
          </div>
        </div>

        <div className="flex md:hidden justify-center mt-6">
          <DonutChart data={categoryData.length > 0 ? categoryData : [{ name: "Sin datos", emoji: "📭", color: "#333", value: 1 }]} size={160} />
        </div>
      </div>

      {/* ─── BUDGET BAR ─── */}
      {budgetEnabled && (
        <div className="px-5 py-5 md:px-8 md:py-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
              Gastaste <span style={{ color: budgetColor, fontWeight: "700" }}>${new Intl.NumberFormat("es-AR").format(budgetUsed)}</span> de <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>${new Intl.NumberFormat("es-AR").format(budgetArs)}</span> ({budgetPct}%)
            </span>
            <span style={{ fontSize: "13px", color: budgetRemaining > 0 ? "var(--accent-green)" : "var(--error)", fontWeight: "700" }}>
              {budgetRemaining > 0 ? `Quedan $${new Intl.NumberFormat("es-AR").format(budgetRemaining)}` : `Excedido $${new Intl.NumberFormat("es-AR").format(Math.abs(budgetRemaining))}`}
            </span>
          </div>
          <div style={{ background: "var(--border)", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetGradient, borderRadius: "3px", transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
        </div>
      )}

      <div style={{ padding: "40px 32px" }}>

        {/* ─── 3 STAT CARDS ─── */}
        <div style={{ gap: "20px", marginBottom: "44px" }} className="grid grid-cols-1 sm:grid-cols-3">
          <StatCard label="Ingresos" value={ingresos_ars} usdValue={ingresos_usd} icon={<TrendingUp size={16} color="var(--accent-green)" />} iconBg="rgba(0,232,122,0.12)" accentColor="var(--accent-green)" />
          <StatCard label="Gastos" value={gastos_ars} usdValue={gastos_usd} icon={<TrendingDown size={16} color="var(--error)" />} iconBg="rgba(239,68,68,0.12)" accentColor="var(--error)" />
          <StatCard label="Cuotas" value={cuotas_ars} usdValue={cuotas_usd} icon={<CreditCard size={16} color="var(--accent-blue)" />} iconBg="rgba(14,165,233,0.12)" accentColor="var(--accent-blue)" />
        </div>

        {/* ─── UPCOMING CUOTAS ─── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px", marginBottom: "44px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)" }}>Cuotas próximos meses</h2>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
            {upcomingMonths.map(({ label, byCard, total }) => (
              <div key={label} style={{ flex: "0 0 calc(33% - 8px)", minWidth: "140px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>{label}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeCards.map((card) => {
                    const amount = byCard[card.id] ?? 0;
                    if (amount === 0) return null;
                    return (
                      <div key={card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: card.color, flexShrink: 0 }} />
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{card.bank}</span>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          ${new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 0 }).format(amount)}
                        </span>
                      </div>
                    );
                  })}
                  {activeCards.filter((c) => (byCard[c.id] ?? 0) > 0).length === 0 && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Sin cuotas</p>
                  )}
                </div>
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: total > 0 ? "var(--error)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {total > 0 ? `$${new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 0 }).format(total)}` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Category breakdown + Recent transactions ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }} className="lg:grid-cols-[1fr,1fr]">

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "20px" }}>Gastos por categoría</h2>
            {categoryData.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Sin gastos este período</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[...categoryData].sort((a, b) => b.value - a.value).map((cat) => {
                  const tot = categoryData.reduce((s, c) => s + c.value, 0);
                  const pct = tot > 0 ? Math.round((cat.value / tot) * 100) : 0;
                  return (
                    <div key={cat.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px" }}>{cat.emoji}</span>
                          <span style={{ fontSize: "13px", fontWeight: 500 }}>{cat.name}</span>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                          <span style={{ fontSize: "13px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>${new Intl.NumberFormat("es-AR").format(cat.value)}</span>
                        </div>
                      </div>
                      <div style={{ background: "var(--border)", borderRadius: "3px", height: "6px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: "3px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Últimas transacciones</h2>
              <a href="/gastos" style={{ fontSize: "12px", color: "var(--accent-green)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                Ver todas <ArrowUpRight size={12} />
              </a>
            </div>

            {recentTransactions.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Sin movimientos este período</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {recentTransactions.map((tx, i) => {
                  const cat = getCat(tx.category_id);
                  const isLast = i === recentTransactions.length - 1;
                  return (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: isLast ? "none" : "1px solid #1d1d1d" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: cat ? `${cat.color}1a` : "#252525", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                        {cat?.emoji ?? "📦"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.detail}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {cat?.name} · {new Date(tx.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: "700", color: tx.kind === "income" ? "var(--accent-green)" : "var(--text-primary)", letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
                          {tx.kind === "income" ? "+" : "−"}${new Intl.NumberFormat("es-AR").format(Number(tx.amount_ars))}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "2px" }}>
                          {tx.kind === "income" ? <ArrowUp size={10} color="var(--accent-green)" /> : <ArrowDown size={10} color="var(--text-muted)" />}
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            u$d {Number(tx.amount_usd) < 10 ? Number(tx.amount_usd).toFixed(1) : Math.round(Number(tx.amount_usd)).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <a href="/gastos" className="md:hidden" style={{ position: "fixed", bottom: "80px", right: "20px", width: "56px", height: "56px", background: "var(--accent-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,232,122,0.4)", textDecoration: "none", zIndex: 40 }}>
        <Plus size={24} color="#0f0f0f" strokeWidth={2.5} />
      </a>
    </div>
  );
}
