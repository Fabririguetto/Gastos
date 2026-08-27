"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { DateRangeFilter, DateRange, currentMonthRange } from "@/components/ui/DateRangeFilter";
import type { Income, Category } from "@/types/database";

function CategoryChip({ cat }: { cat: Category | undefined }) {
  if (!cat) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 500, background: `${cat.color}20`, color: cat.color, whiteSpace: "nowrap" }}>
      {cat.emoji} {cat.name}
    </span>
  );
}

interface IncomeFormData {
  date: string;
  category_id: string;
  detail: string;
  currency: "ARS" | "USD";
  amount: string;
  ccl_rate: string;
}

function IncomeDrawer({
  open, onClose, onSave, editingIncome, categories, currentCcl,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: IncomeFormData, editingId?: string) => Promise<void>;
  editingIncome?: Income | null;
  categories: Category[];
  currentCcl: number;
}) {
  const incomeCats = categories.filter((c) => c.type === "income");

  const defaultForm = (): IncomeFormData => ({
    date: new Date().toISOString().split("T")[0],
    category_id: incomeCats[0]?.id ?? "",
    detail: "",
    currency: "ARS",
    amount: "",
    ccl_rate: String(currentCcl),
  });

  const [form, setForm] = useState<IncomeFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(editingIncome ? {
        date: editingIncome.date,
        category_id: editingIncome.category_id,
        detail: editingIncome.detail,
        currency: editingIncome.currency as "ARS" | "USD",
        amount: String(editingIncome.amount),
        ccl_rate: String(editingIncome.ccl_rate),
      } : defaultForm());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingIncome?.id]);

  const amountNum = parseFloat(form.amount) || 0;
  const cclNum = parseFloat(form.ccl_rate) || currentCcl;
  const equivalent = form.currency === "ARS"
    ? `≈ u$d ${(amountNum / cclNum).toFixed(2)} @ $${cclNum.toLocaleString("es-AR")} CCL`
    : `≈ $${Math.round(amountNum * cclNum).toLocaleString("es-AR")} ARS @ $${cclNum.toLocaleString("es-AR")} CCL`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.detail.trim()) e.detail = "El detalle es obligatorio";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Ingresá un monto mayor a cero";
    if (!form.date) e.date = "La fecha es obligatoria";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100dvh", width: "min(460px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", zIndex: 101, display: "flex", flexDirection: "column", animation: "slideInRight 0.25s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{editingIncome ? "Editar ingreso" : "Agregar ingreso"}</h2>
          <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={errors.date ? { borderColor: "var(--error)" } : {}} />
              {errors.date && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.date}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría</label>
              <div style={{ position: "relative" }}>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={{ appearance: "none", paddingRight: "36px" }}>
                  {incomeCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Detalle *</label>
              <input type="text" placeholder="Ej: Sueldo agosto" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} style={errors.detail ? { borderColor: "var(--error)" } : {}} />
              {errors.detail && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.detail}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Moneda</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["ARS", "USD"] as const).map((cur) => (
                  <button key={cur} onClick={() => setForm({ ...form, currency: cur })} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `2px solid ${form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--border)"}`, background: form.currency === cur ? (cur === "ARS" ? "rgba(0,232,122,0.08)" : "rgba(14,165,233,0.08)") : "transparent", color: form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--text-muted)", cursor: "pointer", fontSize: "15px", fontWeight: "700", transition: "all 0.15s ease" }}>
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto ({form.currency}) *</label>
              <input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={errors.amount ? { borderColor: "var(--error)" } : {}} />
              {errors.amount && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.amount}</p>}
              {amountNum > 0 && <p style={{ fontSize: "12px", color: "var(--accent-blue)", marginTop: "6px" }}>{equivalent}</p>}
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo de cambio CCL</label>
              <input type="number" value={form.ccl_rate} onChange={(e) => setForm({ ...form, ccl_rate: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              if (!validate()) return;
              setSaving(true);
              await onSave(form, editingIncome?.id);
              setSaving(false);
            }}
            style={{ flex: 2, padding: "12px", borderRadius: "8px", background: saving ? "#1d4731" : "var(--accent-green)", border: "none", color: "#0f0f0f", cursor: saving ? "default" : "pointer", fontSize: "14px", fontWeight: "700", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Guardando..." : editingIncome ? "Actualizar ingreso" : "Guardar ingreso"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function IngresosPage() {
  const { showToast } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCcl, setCurrentCcl] = useState(1548);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(currentMonthRange());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "category" | "detail" | "amount_ars">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sb = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = dateRange;

      const [incRes, catRes, rateRes] = await Promise.all([
        sb.from("incomes").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        sb.from("categories").select("*").eq("type", "income").order("name"),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (incRes.data) setIncomes(incRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (rateRes.data) setCurrentCcl(Number(rateRes.data.ccl_rate));
    } catch {
      showToast("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = incomes.filter((i) => {
    const catMatch = selectedCategory === "all" || i.category_id === selectedCategory;
    const searchMatch = !searchQuery || i.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const total = filtered.reduce((s, i) => s + Number(i.amount_ars), 0);
  const getCat = (id: string) => categories.find((c) => c.id === id);
  const incomeCats = categories.filter((c) => c.type === "income");

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") cmp = a.date.localeCompare(b.date);
    else if (sortKey === "category") cmp = (getCat(a.category_id)?.name ?? "").localeCompare(getCat(b.category_id)?.name ?? "");
    else if (sortKey === "detail") cmp = (a.detail ?? "").localeCompare(b.detail ?? "");
    else if (sortKey === "amount_ars") cmp = Number(a.amount_ars) - Number(b.amount_ars);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SI = ({ k }: { k: typeof sortKey }) =>
    <span style={{ marginLeft: "4px", fontSize: "10px", opacity: sortKey === k ? 1 : 0.35 }}>{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>;

  const handleSave = async (data: IncomeFormData, editingId?: string) => {
    const ccl = parseFloat(data.ccl_rate) || currentCcl;
    const amount = parseFloat(data.amount) || 0;
    const amount_ars = data.currency === "ARS" ? amount : amount * ccl;
    const amount_usd = data.currency === "USD" ? amount : amount / ccl;

    const payload = {
      date: data.date,
      category_id: data.category_id,
      detail: data.detail,
      amount,
      currency: data.currency,
      amount_ars,
      amount_usd,
      ccl_rate: ccl,
    };

    try {
      if (editingId) {
        const { error } = await sb.from("incomes").update(payload).eq("id", editingId);
        if (error) throw error;
        showToast("Ingreso actualizado", "success");
      } else {
        const { error } = await sb.from("incomes").insert(payload);
        if (error) throw error;
        showToast("Ingreso guardado", "success");
      }
      setDrawerOpen(false);
      setEditingIncome(null);
      await loadData();
    } catch {
      showToast("Error al guardar el ingreso", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await sb.from("incomes").delete().eq("id", id);
      if (error) throw error;
      showToast("Ingreso eliminado", "success");
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Ingresos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {filtered.length} registros · Total: <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>${new Intl.NumberFormat("es-AR").format(total)}</span>
          </p>
        </div>
        <button onClick={() => { setEditingIncome(null); setDrawerOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "var(--accent-green)", border: "none", borderRadius: "8px", color: "#0f0f0f", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
          <Plus size={16} strokeWidth={2.5} /> Agregar
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", marginBottom: "28px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 180px" }}>
          <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "32px", width: "100%" }} />
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <div style={{ position: "relative", flex: "0 1 180px" }}>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ paddingRight: "32px", appearance: "none", width: "100%" }}>
            <option value="all">Todas las categorías</option>
            {incomeCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Cargando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💼</div>
          <p style={{ fontSize: "16px", fontWeight: "600" }}>Sin ingresos este período</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "8px" }}>Registrá tu primer ingreso con el botón de arriba</p>
        </div>
      ) : (
        <>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th><button onClick={() => toggleSort("date")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", padding: 0, display: "flex", alignItems: "center" }}>Fecha<SI k="date" /></button></th>
                  <th><button onClick={() => toggleSort("category")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", padding: 0, display: "flex", alignItems: "center" }}>Categoría<SI k="category" /></button></th>
                  <th><button onClick={() => toggleSort("detail")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", padding: 0, display: "flex", alignItems: "center" }}>Detalle<SI k="detail" /></button></th>
                  <th style={{ textAlign: "right" }}><button onClick={() => toggleSort("amount_ars")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", padding: 0, display: "flex", alignItems: "center", marginLeft: "auto" }}>ARS<SI k="amount_ars" /></button></th>
                  <th style={{ textAlign: "right" }}>USD</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((income) => (
                  <tr key={income.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                      {new Date(income.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </td>
                    <td><CategoryChip cat={getCat(income.category_id)} /></td>
                    <td><span style={{ fontSize: "13px" }}>{income.detail}</span></td>
                    <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                      +${new Intl.NumberFormat("es-AR").format(Number(income.amount_ars))}
                    </td>
                    <td style={{ textAlign: "right", fontSize: "13px", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                      u$d {Number(income.amount_usd) < 10 ? Number(income.amount_usd).toFixed(1) : Math.round(Number(income.amount_usd))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setEditingIncome(income); setDrawerOpen(true); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px", borderRadius: "6px" }} onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "var(--accent-green)"; (ev.currentTarget as HTMLButtonElement).style.background = "rgba(0,232,122,0.08)"; }} onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (ev.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(income.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "6px", borderRadius: "6px", opacity: 0.7 }} onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.opacity = "1"; }} onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

        </>
      )}

      <IncomeDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingIncome(null); }}
        onSave={handleSave}
        editingIncome={editingIncome}
        categories={categories}
        currentCcl={currentCcl}
      />

    </div>
  );
}
