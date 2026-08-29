"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, LabelList, Legend,
  ComposedChart,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { DateRangeFilter, DateRange, thisYearRange } from "@/components/ui/DateRangeFilter";
import type { Category, InstallmentPurchase } from "@/types/database";

const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

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
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
      <p style={{ color: "#f5f5f5", fontWeight: 600 }}>{d.emoji} {d.name}</p>
      <p style={{ color: d.color, marginTop: 4 }}>${new Intl.NumberFormat("es-AR").format(d.value)}</p>
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

interface MonthRow { dateKey: string; month: string; ingresos: number; gastos: number; ccl: number; }
interface CategoryRow { name: string; emoji: string; color: string; value: number; }
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

export default function AnalyticsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(thisYearRange());

  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [cclData, setCclData] = useState<CclRow[]>([]);
  const [cuotasData, setCuotasData] = useState<CuotasRow[]>([]);

  const sb = createClient();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = dateRange;
      const [expRes, incRes, catRes, rateRes, instRes] = await Promise.all([
        sb.from("expenses").select("date,amount_ars,category_id").gte("date", from).lte("date", to),
        sb.from("incomes").select("date,amount_ars").gte("date", from).lte("date", to),
        sb.from("categories").select("*").eq("type", "expense"),
        sb.from("exchange_rates").select("date,ccl_rate").gte("date", from).lte("date", to).order("date", { ascending: true }),
        sb.from("installment_purchases").select("*"),
      ]);

        const expenses = expRes.data ?? [];
        const incomes = incRes.data ?? [];
        const categories: Category[] = catRes.data ?? [];
        const rates = rateRes.data ?? [];
        const purchases: InstallmentPurchase[] = instRes.data ?? [];

        // Build monthly aggregates
        const monthMap: Record<string, { ingresos: number; gastos: number; ccl: number }> = {};

        for (const e of expenses) {
          const key = e.date.slice(0, 7); // YYYY-MM
          if (!monthMap[key]) monthMap[key] = { ingresos: 0, gastos: 0, ccl: 1548 };
          monthMap[key].gastos += Number(e.amount_ars);
        }
        for (const i of incomes) {
          const key = i.date.slice(0, 7);
          if (!monthMap[key]) monthMap[key] = { ingresos: 0, gastos: 0, ccl: 1548 };
          monthMap[key].ingresos += Number(i.amount_ars);
        }

        // Attach latest CCL rate per month from exchange_rates
        for (const r of rates) {
          const key = r.date.slice(0, 7);
          if (monthMap[key]) monthMap[key].ccl = Number(r.ccl_rate);
        }

        const sortedMonths = Object.keys(monthMap).sort();
        const rows: MonthRow[] = sortedMonths.map((key) => {
          const [, mm] = key.split("-").map(Number);
          return {
            dateKey: key,
            month: MONTH_SHORT[mm - 1],
            ...monthMap[key],
          };
        });
        setMonthlyData(rows);

        // Category donut — all time
        const catMap: Record<string, number> = {};
        for (const e of expenses) {
          catMap[e.category_id] = (catMap[e.category_id] ?? 0) + Number(e.amount_ars);
        }
        const catRows: CategoryRow[] = categories
          .map((c) => ({ name: c.name, emoji: c.emoji, color: c.color, value: catMap[c.id] ?? 0 }))
          .filter((c) => c.value > 0)
          .sort((a, b) => b.value - a.value);
        setCategoryData(catRows);

        // CCL chart
        const cclRows: CclRow[] = rates.map((r) => ({
          date: r.date.slice(0, 7),
          ccl: Number(r.ccl_rate),
        }));
        // Dedupe by month, keep last
        const cclByMonth: Record<string, number> = {};
        for (const r of cclRows) cclByMonth[r.date] = r.ccl;
        setCclData(Object.entries(cclByMonth).sort().map(([date, ccl]) => ({ date, ccl })));

        // Cuotas evolution — consumo mensual, cuota del período y cuota mía
        const lastKnownCcl = rates.length > 0 ? Number(rates[rates.length - 1].ccl_rate) : 1548;
        const cuotasMonthKeys = monthsInRange(from, to);
        const cuotasRows: CuotasRow[] = cuotasMonthKeys.map((key) => {
          const rate = cclByMonth[key] ?? lastKnownCcl;
          let consumo = 0, cuotaPeriodo = 0, cuotaMia = 0;
          for (const p of purchases) {
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
          return { dateKey: key, month: MONTH_SHORT[mm - 1], consumo, cuotaPeriodo, cuotaMia };
        });
        setCuotasData(cuotasRows);

    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

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

  const currentCcl = cclData.length > 0 ? cclData[cclData.length - 1].ccl : 1548;

  const empty = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
      Sin datos aún
    </div>
  );

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Visualizá tus finanzas en perspectiva</p>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px" }}>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {loading ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Cargando datos...</p>
        </div>
      ) : (
        <>
          {/* Row 1: Ingresos vs Gastos */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Ingresos vs Gastos</h2>
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
              {monthlyData.length === 0 ? empty : (
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

          {/* Row 1.5: Evolución de cuotas */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Evolución de cuotas</h2>
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
              {cuotasData.length === 0 ? empty : (
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

          {/* Row 2: Feature stat + Donut + CCL */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "24px", marginBottom: "24px", display: "grid" }}>
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

            {/* Donut */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Gastos por categoría</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Total acumulado</p>
              </div>
              {categoryData.length === 0 ? (
                <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>Sin gastos registrados</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "180px", height: "180px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={56} outerRadius={82} paddingAngle={3} dataKey="value" strokeWidth={0}>
                          {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomDonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {categoryData.slice(0, 4).map((cat) => {
                      const total = categoryData.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                      return (
                        <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                          <span style={{ fontSize: "12px", flex: 1 }}>{cat.emoji} {cat.name}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CCL */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Dólar CCL</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Contado con liquidación</p>
              </div>
              <div style={{ height: "220px" }}>
                {cclData.length === 0 ? empty : (
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
              <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Actual</span>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                  ${new Intl.NumberFormat("es-AR").format(currentCcl)}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Cumulative balance */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Balance acumulado</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Ahorro neto acumulado en ARS y USD</p>
            </div>
            <div style={{ height: "240px" }}>
              {cumulativeData.length === 0 ? empty : (
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
        </>
      )}
    </div>
  );
}
