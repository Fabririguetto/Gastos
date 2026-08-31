"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, Plus, Trash2, Upload, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";
import type { Category, Card, InstallmentPurchase } from "@/types/database";

const EMOJI_OPTIONS = ["🏠", "🛒", "🚗", "💊", "🎮", "📦", "💼", "🎁", "📈", "✈️", "🍔", "📱", "💻", "👕", "⚡"];
const COLOR_OPTIONS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#6b7280", "#00e87a", "#0ea5e9", "#f472b6", "#fb923c",
];

// ─── Date helpers ─────────────────────────────────────────────

function parseExcelDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof val === "string") {
    const s = val.trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseNum(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(String(val).replace(",", ".").replace("$", "").trim());
  return isNaN(n) || n === 0 ? null : n;
}

function parseNumRequired(val: unknown): number {
  return parseNum(val) ?? 0;
}

function firstDayNextMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (m === 12) return `${y + 1}-01-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

function endDateCalc(startStr: string, totalInstallments: number): string {
  const [y, m] = startStr.split("-").map(Number);
  const totalM = y * 12 + (m - 1) + (totalInstallments - 1);
  const newY = Math.floor(totalM / 12);
  const newM = (totalM % 12) + 1;
  return `${newY}-${String(newM).padStart(2, "0")}-01`;
}

function matchCard(tarjetaName: string, cards: Record<string, string>): string | null {
  const t = tarjetaName.toLowerCase().trim();
  if (!t) return null;
  if (cards[t]) return cards[t];
  for (const [k, v] of Object.entries(cards)) {
    if (k.includes(t) || t.includes(k)) return v;
  }
  for (const token of t.split(/\s+/)) {
    if (token.length >= 3) {
      for (const [k, v] of Object.entries(cards)) {
        if (k.includes(token)) return v;
      }
    }
  }
  return null;
}

// ─── Exportar mes (gastos, ingresos, consumos) ─────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

// Cuotas transcurridas hasta `month`, tomando start_date como arranque.
function elapsedInstallmentsAt(startDate: string, month: string, totalInstallments: number): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ry, rm] = month.split("-").map(Number);
  // +1: el mes de start_date ya corresponde a la cuota 1, no a la cuota 0.
  const elapsed = (ry - sy) * 12 + (rm - sm) + 1;
  return Math.max(0, Math.min(elapsed, totalInstallments));
}

interface ExportRow {
  date: string;
  categoria: string;
  detalle: string;
  monto_ars: number;
  monto_usd: number;
  moneda: string;
}

interface ExportConsumo {
  descripcion: string;
  tarjeta: string;
  categoria: string;
  moneda: string;
  cuota_total_ars: number;
  cuota_mia_ars: number;
  descuenta: string;
  progreso: string;
}

interface ExportBundle {
  month: string;
  gastos: ExportRow[];
  ingresos: ExportRow[];
  consumos: ExportConsumo[];
}

async function buildExportBundle(month: string): Promise<ExportBundle> {
  const sb = createClient();
  const { from, to } = monthBounds(month);

  const [expRes, incRes, catRes, cardRes, purRes, rateRes] = await Promise.all([
    sb.from("expenses").select("*").gte("date", from).lte("date", to).order("date"),
    sb.from("incomes").select("*").gte("date", from).lte("date", to).order("date"),
    sb.from("categories").select("*"),
    sb.from("cards").select("*"),
    sb.from("installment_purchases").select("*"),
    sb.from("exchange_rates").select("ccl_rate").lte("date", to).order("date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const categories: Category[] = catRes.data ?? [];
  const cards: Card[] = cardRes.data ?? [];
  const purchases: InstallmentPurchase[] = purRes.data ?? [];
  const ccl = rateRes.data ? Number(rateRes.data.ccl_rate) : 1548;

  const catName = (id: string | null | undefined) => categories.find((c) => c.id === id)?.name ?? "Sin categoría";
  const cardName = (id: string | null | undefined) => cards.find((c) => c.id === id)?.name ?? "—";

  const gastos: ExportRow[] = (expRes.data ?? []).map((e) => ({
    date: e.date,
    categoria: catName(e.category_id),
    detalle: e.detail ?? "",
    monto_ars: Math.round(Number(e.amount_ars)),
    monto_usd: Number(e.amount_usd ?? 0),
    moneda: e.currency,
  }));

  const ingresos: ExportRow[] = (incRes.data ?? []).map((i) => ({
    date: i.date,
    categoria: catName(i.category_id),
    detalle: i.detail ?? "",
    monto_ars: Math.round(Number(i.amount_ars)),
    monto_usd: Number(i.amount_usd ?? 0),
    moneda: i.currency,
  }));

  // Todas las cuotas activas ese mes, descuenten o no del saldo (no depende de `expenses`).
  const consumos: ExportConsumo[] = purchases
    .filter((p) => {
      const startKey = p.start_date.slice(0, 7);
      const endKey = (p.end_date ?? p.start_date).slice(0, 7);
      return startKey <= month && month <= endKey;
    })
    .map((p) => {
      const cuota = Number(p.total_amount) / p.total_installments;
      const cuotaMia = Number(p.paid_amount ?? p.total_amount) / p.total_installments;
      const toArs = (v: number) => (p.currency === "USD" ? v * ccl : v);
      return {
        descripcion: p.description,
        tarjeta: cardName(p.card_id),
        categoria: catName(p.category_id),
        moneda: p.currency,
        cuota_total_ars: Math.round(toArs(cuota)),
        cuota_mia_ars: Math.round(toArs(cuotaMia)),
        descuenta: p.counts_towards_balance ? "Sí" : "No",
        progreso: `${elapsedInstallmentsAt(p.start_date, month, p.total_installments)}/${p.total_installments}`,
      };
    });

  return { month, gastos, ingresos, consumos };
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}

function buildExportCsv(b: ExportBundle): string {
  const lines: string[] = [`Exportación ${b.month}`, ""];

  lines.push("GASTOS");
  lines.push(toCsvRow(["Fecha", "Categoría", "Detalle", "Monto ARS", "Monto USD", "Moneda"]));
  for (const g of b.gastos) lines.push(toCsvRow([g.date, g.categoria, g.detalle, g.monto_ars, g.monto_usd, g.moneda]));
  lines.push(toCsvRow(["", "", "Total", b.gastos.reduce((s, g) => s + g.monto_ars, 0), "", ""]));
  lines.push("");

  lines.push("INGRESOS");
  lines.push(toCsvRow(["Fecha", "Categoría", "Detalle", "Monto ARS", "Monto USD", "Moneda"]));
  for (const i of b.ingresos) lines.push(toCsvRow([i.date, i.categoria, i.detalle, i.monto_ars, i.monto_usd, i.moneda]));
  lines.push(toCsvRow(["", "", "Total", b.ingresos.reduce((s, i) => s + i.monto_ars, 0), "", ""]));
  lines.push("");

  lines.push("CONSUMOS (cuotas activas del mes)");
  lines.push(toCsvRow(["Descripción", "Tarjeta", "Categoría", "Moneda", "Cuota total (ARS)", "Cuota mía (ARS)", "Descuenta saldo", "Progreso"]));
  for (const c of b.consumos) lines.push(toCsvRow([c.descripcion, c.tarjeta, c.categoria, c.moneda, c.cuota_total_ars, c.cuota_mia_ars, c.descuenta, c.progreso]));
  lines.push(toCsvRow(["", "", "", "Total", b.consumos.reduce((s, c) => s + c.cuota_total_ars, 0), "", "", ""]));

  return lines.join("\r\n");
}

function buildExportTxt(b: ExportBundle): string {
  const fmt = (n: number) => new Intl.NumberFormat("es-AR").format(n);
  const totalGastos = b.gastos.reduce((s, g) => s + g.monto_ars, 0);
  const totalIngresos = b.ingresos.reduce((s, i) => s + i.monto_ars, 0);
  const totalConsumos = b.consumos.reduce((s, c) => s + c.cuota_total_ars, 0);
  const sep = "-".repeat(48);

  const lines: string[] = [
    `REPORTE MENSUAL — ${b.month}`,
    "=".repeat(48),
    "",
    `GASTOS (${b.gastos.length})`,
    sep,
    ...b.gastos.map((g) => `${g.date}  [${g.categoria}]  ${g.detalle}  —  $${fmt(g.monto_ars)} ARS`),
    `Total gastos: $${fmt(totalGastos)} ARS`,
    "",
    `INGRESOS (${b.ingresos.length})`,
    sep,
    ...b.ingresos.map((i) => `${i.date}  [${i.categoria}]  ${i.detalle}  —  $${fmt(i.monto_ars)} ARS`),
    `Total ingresos: $${fmt(totalIngresos)} ARS`,
    "",
    `CONSUMOS EN CUOTAS (${b.consumos.length})`,
    sep,
    ...b.consumos.map((c) =>
      `${c.descripcion}  [${c.tarjeta}]  [${c.categoria}]  cuota ${c.progreso}  —  $${fmt(c.cuota_total_ars)} ARS (mía: $${fmt(c.cuota_mia_ars)})  ${c.descuenta === "Sí" ? "descuenta saldo" : "solo seguimiento"}`
    ),
    `Total consumos del mes: $${fmt(totalConsumos)} ARS`,
    "",
    "=".repeat(48),
    `BALANCE DEL MES (ingresos - gastos): $${fmt(totalIngresos - totalGastos)} ARS`,
  ];

  return lines.join("\r\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "700" }}>{title}</h2>
        {description && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saved, disabled }: { onClick: () => void; saved: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        background: saved ? "rgba(0,232,122,0.15)" : "var(--accent-green)",
        border: saved ? "1px solid rgba(0,232,122,0.3)" : "none",
        borderRadius: "8px",
        color: saved ? "var(--accent-green)" : "#0f0f0f",
        fontSize: "13px",
        fontWeight: "700",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
      }}
    >
      <Save size={14} />
      {saved ? "Guardado" : "Guardar"}
    </button>
  );
}

// ─── Import result type ────────────────────────────────────────

interface ImportResult {
  gastos: number;
  ingresos: number;
  cuotas: number;
  cotizaciones: number;
}

// ─── Main page ─────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { showToast } = useToast();

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [budget, setBudget] = useState("800000");
  const [budgetSaved, setBudgetSaved] = useState(false);

  const [ccl, setCcl] = useState("—");
  const [cclManual, setCclManual] = useState(false);
  const [cclSaved, setCclSaved] = useState(false);
  const [cclUpdating, setCclUpdating] = useState(false);

  const [email, setEmail] = useState("");
  const [notifActive, setNotifActive] = useState(true);
  const [emailSaved, setEmailSaved] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📦");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  const [importDragging, setImportDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [exportMonth, setExportMonth] = useState(currentMonth);
  const [exporting, setExporting] = useState<"csv" | "txt" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // ─── Load data ──────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const sb = createClient();
    setLoadingCats(true);

    const [{ data: catsData }, { data: settingsData }, { data: rateData }] = await Promise.all([
      sb.from("categories").select("*").order("type").order("name"),
      sb.from("settings").select("*").limit(1).single(),
      sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).single(),
    ]);

    if (catsData) setCategories(catsData as Category[]);
    if (settingsData) {
      setSettingsId(settingsData.id);
      setBudget(String(settingsData.monthly_budget_ars || 0));
      setEmail(settingsData.notification_email || "");
    }
    if (rateData) setCcl(String(rateData.ccl_rate));

    setLoadingCats(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Settings handlers ──────────────────────────────────────

  const handleSaveBudget = async () => {
    const sb = createClient();
    if (settingsId) {
      await sb.from("settings").update({ monthly_budget_ars: Number(budget) }).eq("id", settingsId);
    }
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2000);
  };

  const handleUpdateCCL = async () => {
    setCclUpdating(true);
    const sb = createClient();
    const { data } = await sb
      .from("exchange_rates")
      .select("ccl_rate")
      .order("date", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setCcl(String(data.ccl_rate));
      showToast("CCL actualizado", "success");
    } else {
      showToast("No hay cotizaciones registradas aún", "warning");
    }
    setCclUpdating(false);
  };

  const handleSaveCCL = async () => {
    if (!cclManual) return;
    const cclNum = parseFloat(ccl);
    if (!isNaN(cclNum) && cclNum > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const sb = createClient();
      await sb.from("exchange_rates").upsert({ date: today, ccl_rate: cclNum }, { onConflict: "date" });
    }
    setCclSaved(true);
    setTimeout(() => setCclSaved(false), 2000);
  };

  const handleSaveEmail = async () => {
    const sb = createClient();
    if (settingsId) {
      await sb.from("settings").update({ notification_email: email }).eq("id", settingsId);
    }
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

  // ─── Category handlers ──────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const sb = createClient();
    const { data, error } = await sb
      .from("categories")
      .insert({ name: newCatName.trim(), type: newCatType, emoji: newCatEmoji, color: newCatColor })
      .select()
      .single();
    if (error) { showToast("Error al guardar categoría", "error"); return; }
    setCategories((prev) => [...prev, data as Category]);
    setNewCatName("");
    showToast("Categoría agregada", "success");
  };

  const handleDeleteCategory = async (id: string) => {
    const sb = createClient();
    const { error } = await sb.from("categories").delete().eq("id", id);
    if (error) { showToast("Error al eliminar categoría", "error"); return; }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // ─── Excel import ───────────────────────────────────────────

  const processImport = useCallback(async (file: File) => {
    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const sb = createClient();

      setImportStep("Cargando categorías y tarjetas...");
      const [{ data: catsData }, { data: cardsData }] = await Promise.all([
        sb.from("categories").select("id,name,type"),
        sb.from("cards").select("id,name"),
      ]);

      const expenseCats: Record<string, string> = {};
      const incomeCats: Record<string, string> = {};
      for (const c of catsData || []) {
        if (c.type === "expense") expenseCats[c.name.toLowerCase()] = c.id;
        else incomeCats[c.name.toLowerCase()] = c.id;
      }
      const cards: Record<string, string> = {};
      for (const c of cardsData || []) cards[c.name.toLowerCase()] = c.id;

      setImportStep("Leyendo archivo Excel...");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });

      const sheetMap: Record<string, XLSX.WorkSheet> = {};
      for (const name of wb.SheetNames) sheetMap[name.toLowerCase()] = wb.Sheets[name];

      const gastosWs   = sheetMap["gastos"]   ?? sheetMap["gasto"];
      const ingresosWs = sheetMap["ingresos"]  ?? sheetMap["ingreso"];
      const datosWs    = sheetMap["datos"]     ?? sheetMap["cuotas"];

      // rows[0] = header, rows.slice(1) = data
      const toRows = (ws: XLSX.WorkSheet): unknown[][] =>
        XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      // ── Gastos ──
      // col0=Fecha | col1=Categoría | col2=Detalle | col3=Monto ARS |
      // col4=Monto U$D | col5=Monto U$D Google (#N/A, ignorar) | col6=Dolar CCL (otro USD)
      // ccl_rate = monto_ars / monto_usd
      const gastosResult: Record<string, unknown>[] = [];
      if (gastosWs) {
        for (const row of toRows(gastosWs).slice(1)) {
          const fecha = parseExcelDate(row[0]);
          if (!fecha) continue;
          const monto_ars = parseNumRequired(row[3]);
          if (!monto_ars) continue;
          const catName = String(row[1] || "otros").toLowerCase().trim();
          const cat_id = expenseCats[catName] ?? expenseCats["otros"] ?? null;
          const amount_usd = parseNum(row[4]);
          const ccl_rate = amount_usd && amount_usd > 0 ? Math.round(monto_ars / amount_usd * 100) / 100 : null;
          gastosResult.push({
            date: fecha,
            category_id: cat_id,
            detail: String(row[2] || "").trim() || null,
            amount: monto_ars,
            currency: "ARS",
            amount_ars: monto_ars,
            amount_usd,
            ccl_rate,
          });
        }
      }

      // ── Ingresos ──
      const ingresosResult: Record<string, unknown>[] = [];
      if (ingresosWs) {
        for (const row of toRows(ingresosWs).slice(1)) {
          const fecha = parseExcelDate(row[0]);
          if (!fecha) continue;
          const monto_ars = parseNumRequired(row[3]);
          if (!monto_ars) continue;
          const catName = String(row[1] || "sueldo").toLowerCase().trim();
          const cat_id = incomeCats[catName] ?? incomeCats["sueldo"] ?? null;
          const amount_usd = parseNum(row[4]);
          const ccl_rate = amount_usd && amount_usd > 0 ? Math.round(monto_ars / amount_usd * 100) / 100 : null;
          ingresosResult.push({
            date: fecha,
            category_id: cat_id,
            detail: String(row[2] || "").trim() || null,
            amount: monto_ars,
            currency: "ARS",
            amount_ars: monto_ars,
            amount_usd,
            ccl_rate,
          });
        }
      }

      // ── Cuotas (Datos) ──
      // col0=Fecha compra | col1=Descripción | col2=Monto total | col3=Monto Abonado |
      // col4=Cuotas | col5=Tarjeta | col8=start_date | col9=end_date
      const cuotasResult: Record<string, unknown>[] = [];
      if (datosWs) {
        const today = new Date();
        for (const row of toRows(datosWs).slice(1)) {
          const fechaCompra = parseExcelDate(row[0]);
          if (!fechaCompra) continue;
          const descripcion = String(row[1] || "").trim();
          if (!descripcion) continue;
          const monto_total = parseNumRequired(row[2]);
          if (!monto_total) continue;
          const monto_abonado = parseNumRequired(row[3]) || monto_total;
          const cuotas = Math.max(1, Math.round(parseNumRequired(row[4]) || 1));
          const tarjeta = String(row[5] || "").trim();

          const card_id = matchCard(tarjeta, cards);

          // Usar fechas ya calculadas en el Excel (cols 8 y 9) si existen
          const startFromXls = parseExcelDate(row[8]);
          const endFromXls = parseExcelDate(row[9]);
          const start = startFromXls ?? firstDayNextMonth(fechaCompra);
          const end = endFromXls ?? endDateCalc(start, cuotas);

          const [sy, sm] = start.split("-").map(Number);
          const monthsElapsed = (today.getFullYear() - sy) * 12 + (today.getMonth() + 1 - sm);
          const paid = Math.max(0, Math.min(monthsElapsed, cuotas));

          cuotasResult.push({
            description: descripcion,
            card_id: card_id ?? null,
            total_amount: monto_total,
            paid_amount: monto_abonado,
            currency: "ARS",
            total_installments: cuotas,
            paid_installments: paid,
            start_date: start,
            end_date: end,
            counts_towards_balance: true,
          });
        }
      }

      // ── Cotizaciones CCL ──
      // ccl_rate = monto_ars (col3) / monto_usd (col4), una por fecha
      const ratesMap: Record<string, number> = {};
      for (const ws of [gastosWs, ingresosWs]) {
        if (!ws) continue;
        for (const row of toRows(ws).slice(1)) {
          const fecha = parseExcelDate(row[0]);
          const monto_ars = parseNumRequired(row[3]);
          const amount_usd = parseNum(row[4]);
          if (fecha && monto_ars > 0 && amount_usd && amount_usd > 0) {
            ratesMap[fecha] = Math.round(monto_ars / amount_usd * 100) / 100;
          }
        }
      }
      const ratesResult = Object.entries(ratesMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, ccl_rate]) => ({ date, ccl_rate }));

      // ── Insert ──
      const BATCH = 100;

      if (ratesResult.length > 0) {
        setImportStep(`Insertando ${ratesResult.length} cotizaciones CCL...`);
        for (let i = 0; i < ratesResult.length; i += BATCH) {
          await sb.from("exchange_rates").upsert(ratesResult.slice(i, i + BATCH), { onConflict: "date", ignoreDuplicates: true });
        }
      }

      if (gastosResult.length > 0) {
        setImportStep(`Insertando ${gastosResult.length} gastos...`);
        for (let i = 0; i < gastosResult.length; i += BATCH) {
          const { error } = await sb.from("expenses").insert(gastosResult.slice(i, i + BATCH));
          if (error) throw new Error(`Gastos: ${error.message}`);
        }
      }

      if (ingresosResult.length > 0) {
        setImportStep(`Insertando ${ingresosResult.length} ingresos...`);
        for (let i = 0; i < ingresosResult.length; i += BATCH) {
          const { error } = await sb.from("incomes").insert(ingresosResult.slice(i, i + BATCH));
          if (error) throw new Error(`Ingresos: ${error.message}`);
        }
      }

      if (cuotasResult.length > 0) {
        setImportStep(`Insertando ${cuotasResult.length} compras en cuotas...`);
        for (let i = 0; i < cuotasResult.length; i += BATCH) {
          const { error } = await sb.from("installment_purchases").insert(cuotasResult.slice(i, i + BATCH));
          if (error) throw new Error(`Cuotas: ${error.message}`);
        }
      }

      setImportResult({
        gastos: gastosResult.length,
        ingresos: ingresosResult.length,
        cuotas: cuotasResult.length,
        cotizaciones: ratesResult.length,
      });
      showToast("Importación completada", "success");
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const msg = raw.toLowerCase().includes("duplicate")
        ? "Ya existen registros duplicados — revisá que no estés importando el mismo archivo dos veces."
        : raw.toLowerCase().includes("foreign key") || raw.toLowerCase().includes("violates")
        ? "Error de referencia en los datos — verificá que las categorías y tarjetas estén configuradas."
        : raw.toLowerCase().includes("too large") || raw.toLowerCase().includes("size")
        ? "El archivo es demasiado grande para procesar."
        : "Error al procesar el archivo. Verificá que el formato sea correcto (Gastos · Ingresos · Datos).";
      setImportError(msg);
      console.error("[import]", raw);
      showToast("Error al importar", "error");
    } finally {
      setImporting(false);
      setImportStep("");
    }
  }, [showToast]);

  const MAX_IMPORT_BYTES = 20 * 1024 * 1024; // 20 MB

  const handleFileDrop = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showToast("Solo se aceptan archivos .xlsx o .xls", "error");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      showToast("El archivo no puede superar los 20 MB", "error");
      return;
    }
    processImport(file);
  };

  // ─── Exportar mes ───────────────────────────────────────────

  const handleExport = async (format: "csv" | "txt") => {
    setExporting(format);
    setExportError(null);
    try {
      const bundle = await buildExportBundle(exportMonth);
      if (bundle.gastos.length === 0 && bundle.ingresos.length === 0 && bundle.consumos.length === 0) {
        showToast("No hay datos para ese mes", "warning");
        return;
      }
      if (format === "csv") {
        downloadFile(`resumen-${exportMonth}.csv`, buildExportCsv(bundle), "text/csv");
      } else {
        downloadFile(`resumen-${exportMonth}.txt`, buildExportTxt(bundle), "text/plain");
      }
      showToast("Exportación descargada", "success");
    } catch {
      setExportError("Error al exportar los datos de ese mes.");
      showToast("Error al exportar", "error");
    } finally {
      setExporting(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Configuración</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Personalizá tu experiencia financiera
        </p>
      </div>

      {/* 1. Presupuesto */}
      <Section title="Presupuesto mensual" description="Define cuánto querés gastar por mes en ARS">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Monto ARS
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setBudgetSaved(false); }}
              placeholder="800000"
            />
          </div>
          <SaveButton onClick={handleSaveBudget} saved={budgetSaved} />
        </div>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
          Presupuesto actual:{" "}
          <span style={{ color: parseInt(budget) > 0 ? "var(--accent-green)" : "var(--text-muted)", fontWeight: 600 }}>
            {parseInt(budget) > 0 ? `$${new Intl.NumberFormat("es-AR").format(parseInt(budget))}` : "Sin límite"}
          </span>
        </p>
      </Section>

      {/* 2. Tipo de cambio */}
      <Section title="Tipo de cambio CCL" description="Se usa para convertir entre ARS y USD en todos los registros">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              CCL actual
            </label>
            <input
              type="number"
              value={ccl}
              onChange={(e) => { setCcl(e.target.value); setCclSaved(false); }}
              disabled={!cclManual}
              style={{ opacity: cclManual ? 1 : 0.5 }}
            />
          </div>
          <button
            onClick={handleUpdateCCL}
            disabled={cclUpdating}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px",
              background: "#202020", border: "1px solid var(--border)", borderRadius: "8px",
              color: "var(--accent-blue)", fontSize: "13px", fontWeight: "600",
              cursor: cclUpdating ? "wait" : "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
            }}
          >
            <RefreshCw size={14} style={{ animation: cclUpdating ? "spin 1s linear infinite" : "none" }} />
            {cclUpdating ? "Actualizando..." : "Actualizar ahora"}
          </button>
          <SaveButton onClick={handleSaveCCL} saved={cclSaved} disabled={!cclManual} />
        </div>

        <div style={{
          marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#202020", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px",
        }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: "500" }}>Override manual</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Desactivá el auto-fetch y usá tu propio valor
            </p>
          </div>
          <button
            onClick={() => setCclManual(!cclManual)}
            style={{
              width: "44px", height: "24px", borderRadius: "12px", border: "none",
              background: cclManual ? "var(--accent-green)" : "var(--border)",
              cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: "3px", left: cclManual ? "23px" : "3px",
              width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease",
            }} />
          </button>
        </div>
      </Section>

      {/* 3. Notificaciones */}
      <Section title="Notificaciones semanales" description="Recibís un resumen cada lunes a las 9am">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailSaved(false); }}
              placeholder="tu@email.com"
            />
          </div>
          <SaveButton onClick={handleSaveEmail} saved={emailSaved} />
        </div>

        <div style={{
          marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#202020", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500" }}>Notificaciones</p>
              <span style={{
                display: "inline-flex", padding: "2px 8px", borderRadius: "100px", fontSize: "11px", fontWeight: 600,
                background: notifActive ? "rgba(0,232,122,0.12)" : "rgba(107,114,128,0.12)",
                color: notifActive ? "var(--accent-green)" : "var(--text-muted)",
              }}>
                {notifActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Próximo envío: lunes · 09:00</p>
          </div>
          <button
            onClick={() => setNotifActive(!notifActive)}
            style={{
              width: "44px", height: "24px", borderRadius: "12px", border: "none",
              background: notifActive ? "var(--accent-green)" : "var(--border)",
              cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: "3px", left: notifActive ? "23px" : "3px",
              width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease",
            }} />
          </button>
        </div>
      </Section>

      {/* 4. Categorías */}
      <Section title="Categorías" description="Personalizá las categorías de gastos e ingresos">
        {loadingCats ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Cargando...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                  background: "#202020", border: "1px solid var(--border)", borderRadius: "8px",
                }}
              >
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: "18px" }}>{cat.emoji}</span>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                <span style={{
                  fontSize: "11px", padding: "2px 8px", borderRadius: "100px",
                  background: cat.type === "expense" ? "rgba(239,68,68,0.12)" : "rgba(0,232,122,0.12)",
                  color: cat.type === "expense" ? "var(--error)" : "var(--accent-green)", fontWeight: 600,
                }}>
                  {cat.type === "expense" ? "Gasto" : "Ingreso"}
                </span>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "4px", opacity: 0.5, flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#202020", border: "1px dashed var(--border)", borderRadius: "10px", padding: "16px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "14px" }}>Agregar categoría</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Emoji</label>
              <select value={newCatEmoji} onChange={(e) => setNewCatEmoji(e.target.value)} style={{ width: "70px", textAlign: "center", fontSize: "18px" }}>
                {EMOJI_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nombre</label>
              <input
                type="text"
                placeholder="Ej: Viajes"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo</label>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewCatType(t)}
                    style={{
                      padding: "8px 10px", borderRadius: "6px",
                      border: `1px solid ${newCatType === t ? (t === "expense" ? "var(--error)" : "var(--accent-green)") : "var(--border)"}`,
                      background: newCatType === t ? (t === "expense" ? "rgba(239,68,68,0.1)" : "rgba(0,232,122,0.1)") : "transparent",
                      color: newCatType === t ? (t === "expense" ? "var(--error)" : "var(--accent-green)") : "var(--text-muted)",
                      cursor: "pointer", fontSize: "12px", fontWeight: "600",
                    }}
                  >
                    {t === "expense" ? "Gasto" : "Ingreso"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Color</label>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "120px" }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewCatColor(c)}
                    style={{
                      width: "20px", height: "20px", borderRadius: "50%", background: c,
                      border: newCatColor === c ? "2px solid white" : "2px solid transparent",
                      cursor: "pointer", transition: "border 0.1s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleAddCategory}
            style={{
              marginTop: "14px", display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", background: "var(--accent-green)", border: "none",
              borderRadius: "8px", color: "#0f0f0f", fontSize: "13px", fontWeight: "700", cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Agregar categoría
          </button>
        </div>
      </Section>

      {/* 5. Exportar mes */}
      <Section title="Exportar datos" description="Descargá gastos, ingresos y consumos en cuotas de un mes para analizarlos o compararlos aparte">
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "0 1 200px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Mes
            </label>
            <input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
          </div>
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px",
              background: "#202020", border: "1px solid var(--border)", borderRadius: "8px",
              color: "var(--accent-blue)", fontSize: "13px", fontWeight: "600",
              cursor: exporting !== null ? "wait" : "pointer", opacity: exporting !== null && exporting !== "csv" ? 0.5 : 1,
            }}
          >
            <Download size={14} />
            {exporting === "csv" ? "Generando..." : "Descargar .csv"}
          </button>
          <button
            onClick={() => handleExport("txt")}
            disabled={exporting !== null}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px",
              background: "#202020", border: "1px solid var(--border)", borderRadius: "8px",
              color: "var(--accent-blue)", fontSize: "13px", fontWeight: "600",
              cursor: exporting !== null ? "wait" : "pointer", opacity: exporting !== null && exporting !== "txt" ? 0.5 : 1,
            }}
          >
            <Download size={14} />
            {exporting === "txt" ? "Generando..." : "Descargar .txt"}
          </button>
        </div>
        {exportError && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "8px", marginTop: "16px",
          }}>
            <AlertCircle size={16} color="var(--error)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "13px", color: "var(--error)" }}>{exportError}</p>
          </div>
        )}
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
          Incluye tres secciones: gastos e ingresos registrados ese mes, y las cuotas en tarjeta activas ese mes (descuenten o no del saldo).
        </p>
      </Section>

      {/* 6. Importar Excel */}
      <Section title="Importar datos" description="Importá tu historial desde un archivo Excel (.xlsx) — Gastos, Ingresos y Cuotas">
        {importResult ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <CheckCircle size={40} color="var(--accent-green)" style={{ margin: "0 auto 16px" }} />
            <p style={{ fontSize: "16px", fontWeight: "700", color: "var(--accent-green)", marginBottom: "12px" }}>
              Importación completada
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", flexWrap: "wrap" }}>
              {[
                { label: "Gastos", value: importResult.gastos },
                { label: "Ingresos", value: importResult.ingresos },
                { label: "Cuotas", value: importResult.cuotas },
                { label: "Cotizaciones", value: importResult.cotizaciones },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: "800" }}>{value}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setImportResult(null)}
              style={{
                marginTop: "20px", padding: "8px 20px", background: "#202020",
                border: "1px solid var(--border)", borderRadius: "8px",
                color: "var(--text-muted)", fontSize: "13px", cursor: "pointer",
              }}
            >
              Importar otro archivo
            </button>
          </div>
        ) : importing ? (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <Loader2 size={32} color="var(--accent-green)" style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Importando...</p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{importStep}</p>
          </div>
        ) : (
          <>
            {importError && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px", marginBottom: "16px",
              }}>
                <AlertCircle size={16} color="var(--error)" style={{ flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "13px", color: "var(--error)", wordBreak: "break-word" }}>{importError}</p>
              </div>
            )}
            <div
              onDragOver={(e) => { e.preventDefault(); setImportDragging(true); }}
              onDragLeave={() => setImportDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setImportDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileDrop(file);
              }}
              style={{
                border: `2px dashed ${importDragging ? "var(--accent-green)" : "var(--border)"}`,
                borderRadius: "12px", padding: "40px 24px", textAlign: "center",
                background: importDragging ? "rgba(0,232,122,0.04)" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <Upload size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "15px", fontWeight: "600" }}>Arrastrá tu Excel acá</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "16px" }}>
                O seleccioná un archivo desde tu dispositivo
              </p>
              <label style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px",
                background: "var(--surface-2, #202020)", border: "1px solid var(--border)",
                borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px",
                fontWeight: "600", cursor: "pointer",
              }}>
                <Upload size={14} />
                Seleccionar Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileDrop(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px" }}>
                Hojas esperadas: Gastos · Ingresos · Datos
              </p>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
