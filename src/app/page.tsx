"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, CreditCard, Calendar, ArrowUpRight, Plus, ArrowUp, ArrowDown, BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, LabelList, Legend, ComposedChart,
} from "recharts";
import { DonutChart } from "@/components/charts/DonutChart";
import { useCountUp } from "@/hooks/useCountUp";
import { createClient } from "@/lib/supabase/client";
import { DateRangeFilter, DateRange, currentMonthRange, thisYearRange, historicRange } from "@/components/ui/DateRangeFilter";
import type { Category, Expense, Income, InstallmentPurchase } from "@/types/database";

const MONTH_NAMES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const tooltipStyle = {
  contentStyle: { background: "#1a1a1a", border: "1px solid #252525", borderRadius: "8px", fontSize: "13px", color: "#f5f5f5" },
};
const axisStyle = {
  tick: { fill: "#6b7280", fontSize: 11 },
  axisLine: { stroke: "#252525" },
  tickLine: { stroke: "transparent" },
};

function formatK(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
      <p style={{ color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name === "ingresos" ? "Ingresos" : "Gastos"}: {formatK(p.value)}
        </p>
      ))}
      {payload.length === 2 && (
        <p style={{ color: "#6b7280", marginTop: "4px", borderTop: "1px solid #252525", paddingTop: "4px" }}>
          Delta: {formatK(payload[0].value - payload[1].value)}
        </p>
      )}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeltaLabel(props: any) {
  const { x, y, width, value, index, data } = props;
  if (!data || index === undefined) return null;
  const row = data[index];
  if (!row || value !== row.ingresos) return null;
  const delta = row.ingresos - row.gastos;
  if (delta <= 0) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#6b7280" fontSize={10} fontWeight={500}>
      +{formatK(delta)}
    </text>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomCuotasTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const LABELS: Record<string, string> = {
    consumo: "Consumo del mes",
    cuotaPeriodo: "Cuotas del período",
    cuotaMia: "Cuotas abonadas por mí",
  };
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
      <p style={{ color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>{label}</p>
      {payload.map((p: { dataKey: string; value: number; color: string }) => (
        <p key={p.dataKey} style={{ color: p.color, marginBottom: "2px" }}>
          {LABELS[p.dataKey] ?? p.dataKey}: {formatK(p.value)}
        </p>
      ))}
    </div>
  );
};

interface MonthRow { dateKey: string; month: string; ingresos: number; gastos: number; ccl: number; }
interface CclRow { date: string; ccl: number; }
interface CuotasRow { dateKey: string; month: string; consumo: number; cuotaPeriodo: number; cuotaMia: number; }

function monthsInRange(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const months: string[] = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function last6MonthsRange(): DateRange {
  const now = new Date();
  const toY = now.getFullYear();
  const toM = now.getMonth() + 1;
  const toDay = new Date(toY, toM, 0).getDate();
  const fromDate = new Date(toY, toM - 6, 1);
  const fromY = fromDate.getFullYear();
  const fromM = fromDate.getMonth() + 1;
  return {
    from: `${fromY}-${String(fromM).padStart(2, "0")}-01`,
    to: `${toY}-${String(toM).padStart(2, "0")}-${String(toDay).padStart(2, "0")}`,
  };
}

// Las cuotas se etiquetan por mes de pago (start_date), no por mes de cierre: una compra
// hecha en agosto se paga en septiembre. El filtro de fecha trabaja en meses de calendario,
// así que hay que traducir "mes calendario elegido" -> "mes de pago" sumando 1.
function addOneMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const total = y * 12 + (m - 1) + 1;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function computeInstallmentsForMonth(dateKey: string, purchases: InstallmentPurchase[]) {
  const [year, month] = dateKey.split("-").map(Number);
  let totalArs = 0, totalUsd = 0, mioArs = 0, mioUsd = 0;
  for (const p of purchases) {
    const [sy, sm] = p.start_date.split("-").map(Number);
    const monthsFromStart = (year - sy) * 12 + (month - sm);
    if (monthsFromStart >= 0 && monthsFromStart < p.total_installments) {
      const totalPer = Number(p.total_amount) / p.total_installments;
      const mioPer = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
      if (p.currency === "USD") { totalUsd += totalPer; mioUsd += mioPer; }
      else { totalArs += totalPer; mioArs += mioPer; }
    }
  }
  return { totalArs, totalUsd, mioArs, mioUsd };
}

function AnimatedNumber({ value, prefix = "$", decimals = 0 }: { value: number; prefix?: string; decimals?: number }) {
  const count = useCountUp(Math.abs(value));
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(count);
  return <span>{value < 0 ? "−" : ""}{prefix}{formatted}</span>;
}

function StatCard({ label, value, usdValue, icon, iconBg, accentColor, tooltip, decimals = 0 }: {
  label: string; value: number; usdValue: number; icon: React.ReactNode; iconBg: string; accentColor?: string; tooltip?: string; decimals?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderLeft: hovered ? `2px solid ${accentColor ?? "var(--accent-green)"}` : "2px solid transparent", borderRadius: "12px", padding: "20px", transition: "border-left-color 0.2s ease, box-shadow 0.2s ease", boxShadow: hovered ? `0 0 20px ${accentColor ?? "var(--accent-green)"}18` : "none", cursor: "default" }}>
      {tooltip && hovered && (
        <div style={{ position: "absolute", left: "12px", right: "12px", bottom: "calc(100% + 8px)", background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", lineHeight: 1.4, color: "var(--text-muted)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 10 }}>
          {tooltip}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <div style={{ width: "32px", height: "32px", background: iconBg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      </div>
      <p style={{ fontSize: "24px", fontWeight: "800", color: accentColor ?? "var(--text-primary)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        $<AnimatedNumber value={value} prefix="" decimals={decimals} />
      </p>
      <p style={{ fontSize: "13px", color: "var(--accent-blue)", marginTop: "6px", fontWeight: 500 }}>
        u$d {new Intl.NumberFormat("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(usdValue)}
      </p>
    </div>
  );
}

function CuotasMesCard({ label, totalArs, totalUsd, mioArs, mioUsd, isShared, icon, iconBg, accentColor, tooltip }: {
  label: string; totalArs: number; totalUsd: number; mioArs: number; mioUsd: number; isShared: boolean;
  icon: React.ReactNode; iconBg: string; accentColor: string; tooltip?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const fmt = (n: number) => new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderLeft: hovered ? `2px solid ${accentColor}` : "2px solid transparent", borderRadius: "12px", padding: "20px", transition: "border-left-color 0.2s ease, box-shadow 0.2s ease", boxShadow: hovered ? `0 0 20px ${accentColor}18` : "none", cursor: "default" }}>
      {tooltip && hovered && (
        <div style={{ position: "absolute", left: "12px", right: "12px", bottom: "calc(100% + 8px)", background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", lineHeight: 1.4, color: "var(--text-muted)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 10 }}>
          {tooltip}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <div style={{ width: "32px", height: "32px", background: iconBg, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      </div>
      <div>
        <p style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>A pagar</p>
        <p style={{ fontSize: "22px", fontWeight: "800", color: accentColor, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          $<AnimatedNumber value={totalArs} prefix="" decimals={2} />
        </p>
        <p style={{ fontSize: "12px", color: "var(--accent-blue)", marginTop: "4px", fontWeight: 500 }}>
          u$d {fmt(totalUsd)}
        </p>
      </div>
      {isShared && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Mi aporte estimado</p>
          <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
            ${fmt(mioArs)}
          </p>
          <p style={{ fontSize: "11px", color: "var(--accent-blue)", marginTop: "2px", fontWeight: 500 }}>
            u$d {fmt(mioUsd)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange());
  const [categoryTab, setCategoryTab] = useState<"expense" | "income">("expense");

  // Analytics section state
  const [analyticsRange, setAnalyticsRange] = useState<DateRange>(thisYearRange());
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [cclData, setCclData] = useState<CclRow[]>([]);
  const [cuotasData, setCuotasData] = useState<CuotasRow[]>([]);

  // Data from Supabase
  const [categories, setCategories] = useState<Category[]>([]);
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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load static data once
  useEffect(() => {
    setMounted(true);
    async function loadStatic() {
      const [catRes, purchaseRes, rateRes, settingsRes] = await Promise.all([
        sb.from("categories").select("*"),
        sb.from("installment_purchases").select("*"),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
        sb.from("settings").select("monthly_budget_ars").maybeSingle(),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (purchaseRes.data) setPurchases(purchaseRes.data);
      if (rateRes.data) setCcl(Number(rateRes.data.ccl_rate));
      if (settingsRes.data) setBudgetArs(Number(settingsRes.data.monthly_budget_ars) || 0);
    }
    loadStatic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load KPI & category data for the selected period
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

  // Load Analytics trend data
  const loadAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const { from, to } = analyticsRange;
      const [expRes, incRes, rateRes, instRes] = await Promise.all([
        sb.from("expenses").select("date,amount_ars,category_id").gte("date", from).lte("date", to),
        sb.from("incomes").select("date,amount_ars").gte("date", from).lte("date", to),
        sb.from("exchange_rates").select("date,ccl_rate").gte("date", from).lte("date", to).order("date", { ascending: true }),
        sb.from("installment_purchases").select("*"),
      ]);

      const aExpenses = expRes.data ?? [];
      const aIncomes = incRes.data ?? [];
      const aRates = rateRes.data ?? [];
      const aPurchases: InstallmentPurchase[] = instRes.data ?? [];

      // Monthly aggregates
      const monthMap: Record<string, { ingresos: number; gastos: number; ccl: number }> = {};
      for (const e of aExpenses) {
        const key = e.date.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { ingresos: 0, gastos: 0, ccl: 1548 };
        monthMap[key].gastos += Number(e.amount_ars);
      }
      for (const i of aIncomes) {
        const key = i.date.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { ingresos: 0, gastos: 0, ccl: 1548 };
        monthMap[key].ingresos += Number(i.amount_ars);
      }
      for (const r of aRates) {
        const key = r.date.slice(0, 7);
        if (monthMap[key]) monthMap[key].ccl = Number(r.ccl_rate);
      }

      const sortedMonths = Object.keys(monthMap).sort();
      const rows: MonthRow[] = sortedMonths.map((key) => {
        const [, mm] = key.split("-").map(Number);
        return {
          dateKey: key,
          month: MONTH_NAMES_SHORT[mm - 1],
          ...monthMap[key],
        };
      });
      setMonthlyData(rows);

      // CCL history
      const cclByMonth: Record<string, number> = {};
      for (const r of aRates) cclByMonth[r.date.slice(0, 7)] = Number(r.ccl_rate);
      const lastKnownCcl = aRates.length > 0 ? Number(aRates[aRates.length - 1].ccl_rate) : 1548;
      setCclData(Object.entries(cclByMonth).sort().map(([date, cclVal]) => ({ date, ccl: cclVal })));

      // Cuotas evolution
      const monthKeysInRange = monthsInRange(from, to);
      const cuotasRows: CuotasRow[] = monthKeysInRange.map((key) => {
        const rate = cclByMonth[key] ?? lastKnownCcl;
        let consumo = 0, cuotaPeriodo = 0, cuotaMia = 0;
        for (const p of aPurchases) {
          const startKey = p.start_date.slice(0, 7);
          const endKey = (p.end_date ?? p.start_date).slice(0, 7);
          const toArs = (v: number) => (p.currency === "USD" ? v * rate : v);
          if (startKey === key) consumo += toArs(Number(p.total_amount));
          if (startKey <= key && key <= endKey) {
            cuotaPeriodo += toArs(Number(p.total_amount) / p.total_installments);
            cuotaMia += toArs(Number(p.paid_amount ?? p.total_amount) / p.total_installments);
          }
        }
        const [, mm] = key.split("-").map(Number);
        return { dateKey: key, month: MONTH_NAMES_SHORT[mm - 1], consumo, cuotaPeriodo, cuotaMia };
      });
      const hasData = (r: CuotasRow) => r.consumo > 0 || r.cuotaPeriodo > 0 || r.cuotaMia > 0;
      const firstIdx = cuotasRows.findIndex(hasData);
      const lastIdx = cuotasRows.length - 1 - [...cuotasRows].reverse().findIndex(hasData);
      setCuotasData(firstIdx === -1 ? [] : cuotasRows.slice(firstIdx, lastIdx + 1));
    } finally {
      setAnalyticsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsRange]);

  useEffect(() => { loadAnalyticsData(); }, [loadAnalyticsData]);

  // Derive month key from start of range for installment computation
  const selectedMonth = dateRange.from.slice(0, 7);
  // Mes de pago correspondiente al mes de calendario filtrado (ver addOneMonth)
  const cuotaMonth = addOneMonth(selectedMonth);

  // Derived values — filtrados por rango para las stat cards
  const ingresos_ars = incomes.reduce((s, i) => s + Number(i.amount_ars), 0);
  const gastos_ars = expenses.reduce((s, e) => s + Number(e.amount_ars), 0);
  // Cuotas a abonar: aporte propio en cuotas para el mes de pago
  const { mioArs: cuotas_ars, mioUsd: cuotas_usd } = computeInstallmentsForMonth(
    cuotaMonth,
    purchases
  );
  // Total del mes de pago filtrado, todas las compras (descuenten o no) — total real vs. mi aporte
  const { totalArs: mesTotalArs, totalUsd: mesTotalUsd, mioArs: mesMioArs, mioUsd: mesMioUsd } = computeInstallmentsForMonth(cuotaMonth, purchases);
  const mesIsShared = Math.abs(mesTotalArs - mesMioArs) > 1 || Math.abs(mesTotalUsd - mesMioUsd) > 0.01;
  const [cuotaMonthY, cuotaMonthM] = cuotaMonth.split("-").map(Number);
  const cuotaMonthLabel = `${MONTH_NAMES_SHORT[cuotaMonthM - 1]} ${cuotaMonthY}`;

  // Saldo histórico: total histórico ingresos - total histórico gastos
  const saldo_ars = historicIngresos - historicGastos;
  const saldo_usd = saldo_ars / ccl;

  const ingresos_usd = ingresos_ars / ccl;
  const gastos_usd = gastos_ars / ccl;

  // Category breakdowns: both expense and income
  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");

  const expenseCategoryData = expenseCats.map((cat) => ({
    name: cat.name,
    emoji: cat.emoji,
    color: cat.color,
    value: expenses.filter((e) => e.category_id === cat.id).reduce((s, e) => s + Number(e.amount_ars), 0),
  })).filter((d) => d.value > 0);

  const incomeCategoryData = incomeCats.map((cat) => ({
    name: cat.name,
    emoji: cat.emoji,
    color: cat.color,
    value: incomes.filter((i) => i.category_id === cat.id).reduce((s, i) => s + Number(i.amount_ars), 0),
  })).filter((d) => d.value > 0);

  const activeCategoryData = categoryTab === "expense" ? expenseCategoryData : incomeCategoryData;

  // Analytics derived calculations
  const maxGastoMonth = monthlyData.length > 0
    ? monthlyData.reduce((prev, curr) => curr.gastos > prev.gastos ? curr : prev)
    : null;

  const avgGastos = monthlyData.length > 0
    ? monthlyData.reduce((s, m) => s + m.gastos, 0) / monthlyData.length
    : 0;

  const cumulativeData = monthlyData.map((d, i) => {
    const slice = monthlyData.slice(0, i + 1);
    return {
      month: d.month,
      saldo_ars: Math.round(slice.reduce((s, m) => s + m.ingresos - m.gastos, 0)),
      saldo_usd: Math.round(slice.reduce((s, m) => s + (m.ingresos - m.gastos) / m.ccl, 0)),
    };
  });

  const currentCcl = cclData.length > 0 ? cclData[cclData.length - 1].ccl : ccl;

  // Recent transactions
  const recentTransactions = [
    ...expenses.map((e) => ({ ...e, kind: "expense" as const })),
    ...incomes.map((i) => ({ ...i, kind: "income" as const })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 5);

  const getCat = (id: string) => categories.find((c) => c.id === id);

  // Budget — gastos_ars ya incluye las cuotas que generan expenses
  const budgetEnabled = budgetArs > 0;
  const budgetUsed = gastos_ars;
  const budgetPct = budgetArs > 0 ? Math.round((budgetUsed / budgetArs) * 100) : 0;
  const budgetRemaining = budgetArs - budgetUsed;
  const budgetGradient = budgetPct < 60 ? "linear-gradient(90deg, #00e87a, #00e87a)" : budgetPct < 85 ? "linear-gradient(90deg, #00e87a 0%, #f59e0b 100%)" : "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";
  const budgetColor = budgetPct < 60 ? "var(--accent-green)" : budgetPct < 85 ? "var(--warning)" : "var(--error)";

  const emptyChart = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
      Sin datos en el período seleccionado
    </div>
  );

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

          <div className="hidden md:flex flex-col items-center gap-3" style={{ flex: "0 0 40%", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px" }}>
              <button
                onClick={() => setCategoryTab("expense")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: categoryTab === "expense" ? 600 : 400,
                  background: categoryTab === "expense" ? "rgba(239,68,68,0.14)" : "transparent",
                  color: categoryTab === "expense" ? "var(--error)" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Gastos
              </button>
              <button
                onClick={() => setCategoryTab("income")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: categoryTab === "income" ? 600 : 400,
                  background: categoryTab === "income" ? "rgba(0,232,122,0.14)" : "transparent",
                  color: categoryTab === "income" ? "var(--accent-green)" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Ingresos
              </button>
            </div>
            <DonutChart
              data={activeCategoryData.length > 0 ? activeCategoryData : [{ name: "Sin datos", emoji: "📭", color: "#333", value: 1 }]}
              size={220}
              label={categoryTab === "expense" ? "GASTOS" : "INGRESOS"}
            />
          </div>
        </div>

        <div className="flex md:hidden flex-col items-center gap-3 mt-6">
          <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => setCategoryTab("expense")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                fontWeight: categoryTab === "expense" ? 600 : 400,
                background: categoryTab === "expense" ? "rgba(239,68,68,0.14)" : "transparent",
                color: categoryTab === "expense" ? "var(--error)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Gastos
            </button>
            <button
              onClick={() => setCategoryTab("income")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                fontWeight: categoryTab === "income" ? 600 : 400,
                background: categoryTab === "income" ? "rgba(0,232,122,0.14)" : "transparent",
                color: categoryTab === "income" ? "var(--accent-green)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Ingresos
            </button>
          </div>
          <DonutChart
            data={activeCategoryData.length > 0 ? activeCategoryData : [{ name: "Sin datos", emoji: "📭", color: "#333", value: 1 }]}
            size={160}
            label={categoryTab === "expense" ? "GASTOS" : "INGRESOS"}
          />
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

        {/* ─── 4 STAT CARDS ─── */}
        <div style={{ gap: "20px", marginBottom: "44px" }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ingresos" value={ingresos_ars} usdValue={ingresos_usd} icon={<TrendingUp size={16} color="var(--accent-green)" />} iconBg="rgba(0,232,122,0.12)" accentColor="var(--accent-green)" tooltip="Suma de los ingresos cargados en el rango de fechas filtrado." />
          <StatCard label="Gastos" value={gastos_ars} usdValue={gastos_usd} icon={<TrendingDown size={16} color="var(--error)" />} iconBg="rgba(239,68,68,0.12)" accentColor="var(--error)" tooltip="Suma de los gastos cargados en el rango de fechas filtrado, incluye las cuotas correspondientes al mes." />
          <StatCard label="Cuotas a abonar" value={cuotas_ars} usdValue={cuotas_usd} icon={<CreditCard size={16} color="var(--accent-blue)" />} iconBg="rgba(14,165,233,0.12)" accentColor="var(--accent-blue)" tooltip="Mi aporte estimado en cuotas para el mes de pago seleccionado." decimals={2} />
          <CuotasMesCard
            label={`Cuotas ${cuotaMonthLabel}`}
            totalArs={mesTotalArs}
            totalUsd={mesTotalUsd}
            mioArs={mesMioArs}
            mioUsd={mesMioUsd}
            isShared={mesIsShared}
            icon={<Calendar size={16} color="#a78bfa" />}
            iconBg="rgba(167,139,250,0.12)"
            accentColor="#a78bfa"
            tooltip={`Total real del resumen que se paga en ${cuotaMonthLabel}: todas las cuotas activas ese mes, descuenten o no del saldo. "Mi aporte estimado" solo aparece si compartís alguna compra y tu aporte difiere del total. El mes de pago es uno más que el mes de calendario filtrado (lo que se consume en agosto se paga en septiembre).`}
          />
        </div>

        {/* ─── Category breakdown + Recent transactions ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "44px" }} className="lg:grid-cols-[1fr,1fr]">

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700" }}>
                {categoryTab === "expense" ? "Gastos por categoría" : "Ingresos por categoría"}
              </h2>
              <div style={{ display: "inline-flex", background: "#1a1a1a", border: "1px solid var(--border)", borderRadius: "8px", padding: "2px" }}>
                <button
                  onClick={() => setCategoryTab("expense")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: categoryTab === "expense" ? 600 : 400,
                    background: categoryTab === "expense" ? "rgba(239,68,68,0.15)" : "transparent",
                    color: categoryTab === "expense" ? "var(--error)" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Gastos
                </button>
                <button
                  onClick={() => setCategoryTab("income")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: categoryTab === "income" ? 600 : 400,
                    background: categoryTab === "income" ? "rgba(0,232,122,0.15)" : "transparent",
                    color: categoryTab === "income" ? "var(--accent-green)" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Ingresos
                </button>
              </div>
            </div>

            {activeCategoryData.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                Sin {categoryTab === "expense" ? "gastos" : "ingresos"} este período
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[...activeCategoryData].sort((a, b) => b.value - a.value).map((cat) => {
                  const tot = activeCategoryData.reduce((s, c) => s + c.value, 0);
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
                          {cat?.name} · {tx.date ? new Date(tx.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—"}
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

        {/* ─── ANALYTICS & TRENDS SECTION ─── */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 size={20} color="var(--accent-green)" />
                <h2 style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em" }}>Análisis y Tendencias</h2>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Visualizá tus finanzas en perspectiva histórica y comparativa
              </p>
            </div>

            {/* Presets selector for trends */}
            <div style={{ display: "flex", gap: "6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px" }}>
              {[
                { label: "Este año", getRange: thisYearRange },
                { label: "Últimos 6m", getRange: last6MonthsRange },
                { label: "Histórico", getRange: historicRange },
              ].map((p) => {
                const pr = p.getRange();
                const active = pr.from === analyticsRange.from && pr.to === analyticsRange.to;
                return (
                  <button
                    key={p.label}
                    onClick={() => setAnalyticsRange(pr)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: `1px solid ${active ? "var(--accent-green)" : "transparent"}`,
                      background: active ? "rgba(0,232,122,0.12)" : "transparent",
                      color: active ? "var(--accent-green)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {analyticsLoading ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "60px 24px", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Cargando analíticas...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Chart 1: Ingresos vs Gastos */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Ingresos vs Gastos</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Comparativa mensual</p>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    {[{ color: "#00e87a", label: "Ingresos" }, { color: "#ef4444", label: "Gastos" }].map((l) => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color }} />
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: "300px" }}>
                  {monthlyData.length === 0 ? emptyChart : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={6} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
                        <XAxis dataKey="month" {...axisStyle} />
                        <YAxis tickFormatter={formatK} {...axisStyle} width={60} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Bar dataKey="ingresos" fill="#00e87a" radius={[4, 4, 0, 0]} maxBarSize={32}>
                          <LabelList content={(props) => <DeltaLabel {...props} data={monthlyData} />} />
                        </Bar>
                        <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Evolución de cuotas */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Evolución de cuotas</h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Consumo mensual vs. cuotas del período</p>
                  </div>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    {[
                      { color: "#a78bfa", label: "Consumo del mes" },
                      { color: "#0ea5e9", label: "Cuotas del período" },
                      { color: "#00e87a", label: "Cuotas abonadas por mí" },
                    ].map((l) => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color }} />
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: "300px" }}>
                  {cuotasData.length === 0 ? emptyChart : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={cuotasData} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
                        <XAxis dataKey="month" {...axisStyle} />
                        <YAxis tickFormatter={formatK} {...axisStyle} width={60} />
                        <Tooltip content={<CustomCuotasTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Bar dataKey="consumo" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Line type="monotone" dataKey="cuotaPeriodo" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="cuotaMia" stroke="#00e87a" strokeWidth={2} dot={{ fill: "#00e87a", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Row 3: Mes con mayor gasto + Dólar CCL */}
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "24px", display: "grid" }}>
                {/* Mes con mayor gasto */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>Mes con mayor gasto</p>
                    {maxGastoMonth ? (
                      <>
                        <p style={{ fontSize: "36px", fontWeight: "800", color: "var(--error)", letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                          {formatK(maxGastoMonth.gastos)}
                        </p>
                        <p style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginTop: "8px", letterSpacing: "-0.02em" }}>
                          {maxGastoMonth.month} {maxGastoMonth.dateKey.split("-")[0]}
                        </p>
                      </>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Sin datos</p>
                    )}
                  </div>
                  {maxGastoMonth && avgGastos > 0 && (
                    <div style={{ marginTop: "20px", padding: "12px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>vs promedio</p>
                      <p style={{ fontSize: "14px", fontWeight: "700", color: "var(--error)", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
                        +{formatK(Math.max(0, maxGastoMonth.gastos - Math.round(avgGastos)))}
                      </p>
                    </div>
                  )}
                </div>

                {/* CCL */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Dólar CCL</h3>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Contado con liquidación</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>Actual</span>
                      <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                        ${new Intl.NumberFormat("es-AR").format(currentCcl)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: "200px" }}>
                    {cclData.length === 0 ? emptyChart : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cclData}>
                          <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
                          <XAxis dataKey="date" {...axisStyle} tickFormatter={(v: string) => v.slice(5)} />
                          <YAxis {...axisStyle} width={55} tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`} domain={["auto", "auto"]} />
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <Tooltip {...tooltipStyle} formatter={(v: any) => [`$${Number(v).toLocaleString("es-AR")}`, "CCL"]} />
                          <Line type="monotone" dataKey="ccl" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Balance acumulado */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "700" }}>Balance acumulado</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Ahorro neto acumulado en ARS y USD</p>
                </div>
                <div style={{ height: "260px" }}>
                  {cumulativeData.length === 0 ? emptyChart : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumulativeData}>
                        <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
                        <XAxis dataKey="month" {...axisStyle} />
                        <YAxis yAxisId="ars" {...axisStyle} width={isMobile ? 48 : 65} tickFormatter={formatK} />
                        {!isMobile && (
                          <YAxis yAxisId="usd" orientation="right" {...axisStyle} width={52} tickFormatter={(v: number) => `u$d${Math.round(v)}`} />
                        )}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <Tooltip {...tooltipStyle} formatter={(v: any, name: any) => name === "saldo_ars" ? [`$${new Intl.NumberFormat("es-AR").format(Number(v))}`, "ARS"] : [`u$d ${Number(v).toLocaleString("es-AR")}`, "USD"]} />
                        <Legend formatter={(value) => <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{value === "saldo_ars" ? "Balance ARS" : "Balance USD"}</span>} />
                        <Line yAxisId="ars" type="monotone" dataKey="saldo_ars" stroke="#00e87a" strokeWidth={2} dot={{ fill: "#00e87a", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                        <Line yAxisId={isMobile ? "ars" : "usd"} type="monotone" dataKey="saldo_usd" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      <a href="/gastos" className="md:hidden" style={{ position: "fixed", bottom: "80px", right: "20px", width: "56px", height: "56px", background: "var(--accent-green)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,232,122,0.4)", textDecoration: "none", zIndex: 40 }}>
        <Plus size={24} color="#0f0f0f" strokeWidth={2.5} />
      </a>
    </div>
  );
}
