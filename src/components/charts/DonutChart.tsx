"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DonutData {
  name: string;
  value: number;
  color: string;
  emoji: string;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
}

const formatARS = (v: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as DonutData;
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
        <p style={{ color: d.color, marginTop: 4 }}>{formatARS(d.value)}</p>
      </div>
    );
  }
  return null;
};

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <p style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
          GASTOS
        </p>
        <p
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "var(--text-primary)",
            marginTop: "2px",
            lineHeight: 1,
          }}
        >
          {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(total / 1000)}k
        </p>
      </div>
    </div>
  );
}
