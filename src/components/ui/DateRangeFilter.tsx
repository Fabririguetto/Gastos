"use client";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

function prevMonthRange(): DateRange {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export function thisYearRange(): DateRange {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function historicRange(): DateRange {
  return { from: "2000-01-01", to: "2099-12-31" };
}

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const PRESETS = [
  { label: "Este mes", range: currentMonthRange },
  { label: "Mes ant.", range: prevMonthRange },
  { label: "Este año", range: thisYearRange },
  { label: "Histórico", range: historicRange },
] as const;

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: Props) {
  const isPreset = (r: DateRange) =>
    PRESETS.some((p) => {
      const pr = p.range();
      return pr.from === r.from && pr.to === r.to;
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {/* Preset buttons */}
      <div style={{ display: "flex", gap: "4px" }}>
        {PRESETS.map((p) => {
          const pr = p.range();
          const active = pr.from === value.from && pr.to === value.to;
          return (
            <button
              key={p.label}
              onClick={() => onChange(pr)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: `1px solid ${active ? "var(--accent-green)" : "var(--border)"}`,
                background: active ? "rgba(0,232,122,0.1)" : "transparent",
                color: active ? "var(--accent-green)" : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />

      {/* Date inputs */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="date"
          value={value.from}
          onChange={(e) => {
            const from = e.target.value;
            const to = from > value.to ? addMonths(from, 1) : value.to;
            onChange({ from, to });
          }}
          style={{ padding: "6px 10px", fontSize: "13px", width: "140px" }}
        />
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>→</span>
        <input
          type="date"
          value={value.to}
          onChange={(e) => {
            const to = e.target.value;
            const from = to < value.from ? addMonths(to, -1) : value.from;
            onChange({ from, to });
          }}
          style={{ padding: "6px 10px", fontSize: "13px", width: "140px" }}
        />
      </div>
    </div>
  );
}
