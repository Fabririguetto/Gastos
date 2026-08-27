"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { DateRangeFilter, DateRange, currentMonthRange } from "@/components/ui/DateRangeFilter";
import type { Expense, Category } from "@/types/database";

function CategoryChip({ cat }: { cat: Category | undefined }) {
  if (!cat) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 500, background: `${cat.color}20`, color: cat.color, whiteSpace: "nowrap" }}>
      {cat.emoji} {cat.name}
    </span>
  );
}

interface ExpenseFormData {
  date: string;
  category_id: string;
  detail: string;
  currency: "ARS" | "USD";
  amount: string;
  ccl_rate: string;
}

function ExpenseDrawer({
  open, onClose, onSave, editingExpense, categories, currentCcl,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData, editingId?: string) => Promise<void>;
  editingExpense?: Expense | null;
  categories: Category[];
  currentCcl: number;
}) {
  const expenseCats = categories.filter((c) => c.type === "expense");

  const defaultForm = (): ExpenseFormData => ({
    date: new Date().toISOString().split("T")[0],
    category_id: expenseCats[0]?.id ?? "",
    detail: "",
    currency: "ARS",
    amount: "",
    ccl_rate: String(currentCcl),
  });

  const [form, setForm] = useState<ExpenseFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(editingExpense ? {
        date: editingExpense.date,
        category_id: editingExpense.category_id,
        detail: editingExpense.detail,
        currency: editingExpense.currency as "ARS" | "USD",
        amount: String(editingExpense.amount),
        ccl_rate: String(editingExpense.ccl_rate),
      } : defaultForm());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingExpense?.id]);

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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{editingExpense ? "Editar gasto" : "Agregar gasto"}</h2>
          <button onClick={onClose} style={{ background: "#252525", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: "6px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Fecha */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={errors.date ? { borderColor: "var(--error)" } : {}} />
              {errors.date && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.date}</p>}
            </div>

            {/* Categoría */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría</label>
              <div style={{ position: "relative" }}>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={{ appearance: "none", paddingRight: "36px" }}>
                  {expenseCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Detalle */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Detalle *</label>
              <input type="text" placeholder="Ej: Supermercado Carrefour" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} style={errors.detail ? { borderColor: "var(--error)" } : {}} />
              {errors.detail && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.detail}</p>}
            </div>

            {/* Moneda */}
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

            {/* Monto */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto ({form.currency}) *</label>
              <input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={errors.amount ? { borderColor: "var(--error)" } : {}} />
              {errors.amount && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.amount}</p>}
              {amountNum > 0 && <p style={{ fontSize: "12px", color: "var(--accent-blue)", marginTop: "6px" }}>{equivalent}</p>}
            </div>

            {/* CCL */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipo de cambio CCL</label>
              <input type="number" value={form.ccl_rate} onChange={(e) => setForm({ ...form, ccl_rate: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              if (!validate()) return;
              setSaving(true);
              await onSave(form, editingExpense?.id);
              setSaving(false);
            }}
            style={{ flex: 2, padding: "12px", borderRadius: "8px", background: saving ? "#1d4731" : "var(--accent-green)", border: "none", color: "#0f0f0f", cursor: saving ? "default" : "pointer", fontSize: "14px", fontWeight: "700", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Guardando..." : editingExpense ? "Actualizar gasto" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function GastosPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCcl, setCurrentCcl] = useState(1548);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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

      const [expRes, catRes, rateRes] = await Promise.all([
        sb.from("expenses").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        sb.from("categories").select("*").eq("type", "expense").order("name"),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (expRes.data) setExpenses(expRes.data);
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

  const filtered = expenses.filter((e) => {
    const catMatch = selectedCategory === "all" || e.category_id === selectedCategory;
    const searchMatch = !searchQuery || e.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount_ars), 0);

  const getCat = (id: string) => categories.find((c) => c.id === id);

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

  const handleSave = async (data: ExpenseFormData, editingId?: string) => {
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
        const { error } = await sb.from("expenses").update(payload).eq("id", editingId);
        if (error) throw error;
        showToast("Gasto actualizado", "success");
      } else {
        const { error } = await sb.from("expenses").insert(payload);
        if (error) throw error;
        showToast("Gasto guardado", "success");
      }
      setDrawerOpen(false);
      setEditingExpense(null);
      await loadData();
    } catch {
      showToast("Error al guardar el gasto", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await sb.from("expenses").delete().eq("id", id);
      if (error) throw error;
      showToast("Gasto eliminado", "success");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const expenseCats = categories.filter((c) => c.type === "expense");

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Gastos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {filtered.length} registros · Total: <span style={{ color: "var(--error)", fontWeight: 600 }}>${new Intl.NumberFormat("es-AR").format(total)}</span>
          </p>
        </div>
        <button onClick={() => { setEditingExpense(null); setDrawerOpen(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "var(--accent-green)", border: "none", borderRadius: "8px", color: "#0f0f0f", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
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
            {expenseCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Cargando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
          <p style={{ fontSize: "16px", fontWeight: "600" }}>Sin gastos este período</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "8px" }}>Agrega tu primer gasto con el botón +</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
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
                  {sorted.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        {new Date(e.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </td>
                      <td><CategoryChip cat={getCat(e.category_id)} /></td>
                      <td><span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "220px" }}>{e.detail}</span></td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                        ${new Intl.NumberFormat("es-AR").format(Number(e.amount_ars))}
                      </td>
                      <td style={{ textAlign: "right", fontSize: "13px", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                        u$d {Number(e.amount_usd) < 10 ? Number(e.amount_usd).toFixed(1) : Math.round(Number(e.amount_usd))}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => { setEditingExpense(e); setDrawerOpen(true); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "6px", borderRadius: "6px" }} onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "var(--accent-green)"; (ev.currentTarget as HTMLButtonElement).style.background = "rgba(0,232,122,0.08)"; }} onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (ev.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "6px", borderRadius: "6px", opacity: 0.7 }} onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.opacity = "1"; }} onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}>
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

      <ExpenseDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingExpense(null); }}
        onSave={handleSave}
        editingExpense={editingExpense}
        categories={categories}
        currentCcl={currentCcl}
      />

    </div>
  );
}
