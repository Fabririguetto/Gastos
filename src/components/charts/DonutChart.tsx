"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const [active, setActive] = useState<DonutData | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  const displayed = active ?? null;
  const centerValue = displayed ? displayed.value : total;
  const centerLabel = displayed ? `${displayed.emoji} ${displayed.name}` : "GASTOS";
  const isTotal = !displayed;

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
            onMouseEnter={(_, index) => setActive(data[index])}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={active && active.name !== entry.name ? 0.4 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center label — updates on hover, no floating tooltip */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
          width: size * 0.55,
        }}
      >
        <p
          style={{
            fontSize: size < 160 ? "9px" : "10px",
            color: active ? active.color : "var(--text-muted)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.15s ease",
          }}
        >
          {centerLabel}
        </p>
        <p
          style={{
            fontSize: size < 160 ? "12px" : "14px",
            fontWeight: "700",
            color: isTotal ? "var(--text-primary)" : (active?.color ?? "var(--text-primary)"),
            marginTop: "2px",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            transition: "color 0.15s ease",
          }}
        >
          ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
            centerValue >= 1000 ? Math.round(centerValue / 1000) : centerValue
          )}{centerValue >= 1000 ? "k" : ""}
        </p>
      </div>
    </div>
  );
}
