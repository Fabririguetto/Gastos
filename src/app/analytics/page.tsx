"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { MONTHLY_DATA, CATEGORIES, EXPENSES, EXCHANGE_RATES } from "@/lib/mock-data";

const PERIOD_TABS = ["Mes", "Trimestre", "Año"] as const;
type Period = (typeof PERIOD_TABS)[number];

const expenseCategories = CATEGORIES.filter((c) => c.type === "expense");

const categoryDonutData = expenseCategories.map((cat) => ({
  name: cat.name,
  emoji: cat.emoji,
  color: cat.color,
  value: EXPENSES.filter((e) => e.category_id === cat.id).reduce(
    (s, e) => s + e.amount_ars,
    0
  ),
})).filter((d) => d.value > 0);

const cclData = EXCHANGE_RATES.map((r) => ({
  date: r.date.slice(0, 7),
  ccl: r.ccl_rate,
}));

const cumulativeData = MONTHLY_DATA.map((d, i) => ({
  month: d.month,
  saldo_ars: MONTHLY_DATA.slice(0, i + 1).reduce(
    (s, m) => s + m.ingresos - m.gastos,
    0
  ),
  saldo_usd: Math.round(
    MONTHLY_DATA.slice(0, i + 1).reduce(
      (s, m) => s + (m.ingresos - m.gastos) / m.ccl,
      0
    )
  ),
}));

const tooltipStyle = {
  contentStyle: {
    background: "#1a1a1a",
    border: "1px solid #252525",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#f5f5f5",
  },
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
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #252525",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
      }}
    >
      <p style={{ color: "#6b7280", marginBottom: "6px", fontWeight: 600 }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color, marginBottom: "2px" }}>
          {p.name === "ingresos" ? "Ingresos" : "Gastos"}: {formatK(p.value)}
        </p>
      ))}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #252525",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
      }}
    >
      <p style={{ color: "#f5f5f5", fontWeight: 600 }}>
        {d.emoji} {d.name}
      </p>
      <p style={{ color: d.color, marginTop: 4 }}>
        ${new Intl.NumberFormat("es-AR").format(d.value)}
      </p>
    </div>
  );
};

function getFilteredData(period: Period) {
  if (period === "Mes") return MONTHLY_DATA.slice(-1);
  if (period === "Trimestre") return MONTHLY_DATA.slice(-3);
  return MONTHLY_DATA;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("Año");

  const filteredData = getFilteredData(period);

  return (
    <div
      style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: "1200px", animation: "fadeIn 0.4s ease-out" }}
      className="mx-auto"
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Visualizá tus finanzas en perspectiva
          </p>
        </div>

        {/* Period tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "4px",
            gap: "2px",
          }}
        >
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setPeriod(tab)}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "none",
                background: period === tab ? "var(--accent-green)" : "transparent",
                color: period === tab ? "#0f0f0f" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: period === tab ? "700" : "400",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Ingresos vs Gastos bar chart */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Ingresos vs Gastos</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Comparativa mensual · {period}
          </p>
        </div>

        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} barGap={4} barCategoryGap="30%">
              <CartesianGrid
                strokeDasharray="0"
                stroke="#1d1d1d"
                vertical={false}
              />
              <XAxis dataKey="month" {...axisStyle} />
              <YAxis tickFormatter={formatK} {...axisStyle} width={60} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="ingresos" fill="#00e87a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "20px", marginTop: "16px", justifyContent: "center" }}>
          {[
            { color: "#00e87a", label: "Ingresos" },
            { color: "#ef4444", label: "Gastos" },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Donut + CCL Line */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
        className="grid-cols-1 md:grid-cols-2"
      >
        {/* Donut: gastos por categoría */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Gastos por categoría</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Total acumulado 2026
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ width: "160px", height: "160px", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {categoryDonutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: "120px" }}>
              {categoryDonutData
                .sort((a, b) => b.value - a.value)
                .map((cat) => {
                  const total = categoryDonutData.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                  return (
                    <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: cat.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: "12px", flex: 1, color: "var(--text-primary)" }}>
                        {cat.emoji} {cat.name}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Line: CCL evolution */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Evolución del dólar CCL</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Tipo de cambio contado con liquidación
            </p>
          </div>

          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cclData}>
                <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
                <XAxis dataKey="date" {...axisStyle} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis
                  {...axisStyle}
                  width={55}
                  tickFormatter={(v: number) => `$${v.toLocaleString("es-AR")}`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [`$${v.toLocaleString("es-AR")}`, "CCL"]}
                />
                <Line
                  type="monotone"
                  dataKey="ccl"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: "#0ea5e9", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Cumulative balance */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700" }}>Balance acumulado</h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            ARS y USD — ahorro neto acumulado en 2026
          </p>
        </div>

        <div style={{ height: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="0" stroke="#1d1d1d" vertical={false} />
              <XAxis dataKey="month" {...axisStyle} />
              <YAxis
                yAxisId="ars"
                {...axisStyle}
                width={65}
                tickFormatter={formatK}
              />
              <YAxis
                yAxisId="usd"
                orientation="right"
                {...axisStyle}
                width={55}
                tickFormatter={(v: number) => `u$d${Math.round(v / 1000)}k`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number, name: string) =>
                  name === "saldo_ars"
                    ? [`$${new Intl.NumberFormat("es-AR").format(v)}`, "ARS"]
                    : [`u$d ${v.toLocaleString("es-AR")}`, "USD"]
                }
              />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {value === "saldo_ars" ? "Balance ARS" : "Balance USD"}
                  </span>
                )}
              />
              <Line
                yAxisId="ars"
                type="monotone"
                dataKey="saldo_ars"
                stroke="#00e87a"
                strokeWidth={2}
                dot={{ fill: "#00e87a", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="usd"
                type="monotone"
                dataKey="saldo_usd"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: "#0ea5e9", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
