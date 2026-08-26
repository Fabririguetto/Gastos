"use client";

import { useState } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, Search } from "lucide-react";
import { INCOMES, CATEGORIES, CURRENT_CCL, getCategoryById } from "@/lib/mock-data";
import type { Income } from "@/types/database";

const MONTHS = [
  { value: "2026-08", label: "Agosto 2026" },
  { value: "2026-07", label: "Julio 2026" },
  { value: "2026-06", label: "Junio 2026" },
  { value: "2026-05", label: "Mayo 2026" },
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-03", label: "Marzo 2026" },
  { value: "2026-02", label: "Febrero 2026" },
  { value: "2026-01", label: "Enero 2026" },
];

const incomeCategories = CATEGORIES.filter((c) => c.type === "income");

function CategoryChip({ categoryId }: { categoryId: string }) {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "100px",
        fontSize: "12px",
        fontWeight: 500,
        background: `${cat.color}20`,
        color: cat.color,
        whiteSpace: "nowrap",
      }}
    >
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
  open,
  onClose,
  onSave,
  editingIncome,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: IncomeFormData, editingId?: string) => void;
  editingIncome?: Income | null;
}) {
  const defaultForm: IncomeFormData = {
    date: new Date().toISOString().split("T")[0],
    category_id: incomeCategories[0]?.id ?? "",
    detail: "",
    currency: "ARS",
    amount: "",
    ccl_rate: String(CURRENT_CCL),
  };

  const [form, setForm] = useState<IncomeFormData>(
    editingIncome
      ? {
          date: editingIncome.date,
          category_id: editingIncome.category_id,
          detail: editingIncome.detail,
          currency: editingIncome.currency as "ARS" | "USD",
          amount: String(editingIncome.amount),
          ccl_rate: String(editingIncome.ccl_rate),
        }
      : defaultForm
  );

  const [lastEditing, setLastEditing] = useState<string | undefined>(editingIncome?.id);
  if (editingIncome?.id !== lastEditing) {
    setLastEditing(editingIncome?.id);
    if (editingIncome) {
      setForm({
        date: editingIncome.date,
        category_id: editingIncome.category_id,
        detail: editingIncome.detail,
        currency: editingIncome.currency as "ARS" | "USD",
        amount: String(editingIncome.amount),
        ccl_rate: String(editingIncome.ccl_rate),
      });
    } else {
      setForm(defaultForm);
    }
  }

  const amountNum = parseFloat(form.amount) || 0;
  const cclNum = parseFloat(form.ccl_rate) || CURRENT_CCL;

  const equivalent =
    form.currency === "ARS"
      ? `≈ u$d ${(amountNum / cclNum).toFixed(2)} @ $${cclNum.toLocaleString("es-AR")} CCL`
      : `≈ $${Math.round(amountNum * cclNum).toLocaleString("es-AR")} ARS @ $${cclNum.toLocaleString("es-AR")} CCL`;

  if (!open) return null;

  const isEditing = !!editingIncome;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 100,
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(460px, 100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
              {isEditing ? "Editar ingreso" : "Agregar ingreso"}
            </h2>
            {isEditing && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Modificá los datos del ingreso
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#252525",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              borderRadius: "6px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fecha
              </label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Categoría
              </label>
              <div style={{ position: "relative" }}>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={{ appearance: "none", paddingRight: "36px" }}>
                  {incomeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Detalle
              </label>
              <input type="text" placeholder="Ej: Sueldo agosto" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Moneda
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["ARS", "USD"] as const).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => setForm({ ...form, currency: cur })}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "8px",
                      border: `2px solid ${form.currency === cur ? (cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)") : "var(--border)"}`,
                      background: form.currency === cur
                        ? cur === "ARS" ? "rgba(0,232,122,0.08)" : "rgba(14,165,233,0.08)"
                        : "transparent",
                      color: form.currency === cur
                        ? cur === "ARS" ? "var(--accent-green)" : "var(--accent-blue)"
                        : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "700",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Monto ({form.currency})
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {amountNum > 0 && (
                <p style={{ fontSize: "12px", color: "var(--accent-blue)", marginTop: "6px" }}>
                  {equivalent}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                CCL aplicado
              </label>
              <input
                type="number"
                value={form.ccl_rate}
                onChange={(e) => setForm({ ...form, ccl_rate: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (form.detail && form.amount) {
                onSave(form, editingIncome?.id);
                onClose();
              }
            }}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "8px",
              background: "var(--accent-green)",
              border: "none",
              color: "#0f0f0f",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {isEditing ? "Actualizar ingreso" : "Guardar ingreso"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function IngresosPage() {
  const [incomes, setIncomes] = useState<Income[]>(INCOMES);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2026-08");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = incomes.filter((i) => {
    const monthMatch = i.date.startsWith(selectedMonth);
    const catMatch = selectedCategory === "all" || i.category_id === selectedCategory;
    const searchMatch = !searchQuery || i.detail.toLowerCase().includes(searchQuery.toLowerCase());
    return monthMatch && catMatch && searchMatch;
  });

  const total = filtered.reduce((s, i) => s + i.amount_ars, 0);

  const openAdd = () => {
    setEditingIncome(null);
    setDrawerOpen(true);
  };

  const openEdit = (income: Income) => {
    setEditingIncome(income);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditingIncome(null);
  };

  const handleSave = (data: IncomeFormData, editingId?: string) => {
    const ccl = parseFloat(data.ccl_rate) || CURRENT_CCL;
    const amount = parseFloat(data.amount) || 0;

    if (editingId) {
      setIncomes((prev) =>
        prev.map((i) =>
          i.id === editingId
            ? {
                ...i,
                date: data.date,
                category_id: data.category_id,
                detail: data.detail,
                amount,
                currency: data.currency,
                amount_ars: data.currency === "ARS" ? amount : amount * ccl,
                amount_usd: data.currency === "USD" ? amount : amount / ccl,
                ccl_rate: ccl,
              }
            : i
        )
      );
    } else {
      const newIncome: Income = {
        id: `i-${Date.now()}`,
        date: data.date,
        category_id: data.category_id,
        detail: data.detail,
        amount,
        currency: data.currency,
        amount_ars: data.currency === "ARS" ? amount : amount * ccl,
        amount_usd: data.currency === "USD" ? amount : amount / ccl,
        ccl_rate: ccl,
        created_at: new Date().toISOString(),
      };
      setIncomes((prev) => [newIncome, ...prev]);
    }
  };

  const handleDelete = (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div style={{ minHeight: "100vh", maxWidth: "1200px", animation: "fadeIn 0.4s ease-out" }} className="mx-auto px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Ingresos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {filtered.length} registros · Total:{" "}
            <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
              ${new Intl.NumberFormat("es-AR").format(total)}
            </span>
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "var(--accent-green)",
            border: "none",
            borderRadius: "8px",
            color: "#0f0f0f",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Agregar
        </button>
      </div>

      {/* Search + Filters */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 180px" }}>
          <Search size={13} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>

        <div style={{ position: "relative", flex: "1 1 140px" }}>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ paddingRight: "32px", appearance: "none", width: "100%" }}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>

        <div style={{ position: "relative", flex: "1 1 140px" }}>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ paddingRight: "32px", appearance: "none", width: "100%" }}>
            <option value="all">Todas las categorías</option>
            {incomeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💼</div>
          <p style={{ fontSize: "16px", fontWeight: "600" }}>Sin ingresos este período</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "8px" }}>
            Registrá tu primer ingreso con el botón de arriba
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div
            className="hidden md:block"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Detalle</th>
                  <th style={{ textAlign: "right" }}>ARS</th>
                  <th style={{ textAlign: "right" }}>USD</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((income) => (
                  <tr key={income.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                      {new Date(income.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </td>
                    <td><CategoryChip categoryId={income.category_id} /></td>
                    <td>
                      <span style={{ fontSize: "13px" }}>{income.detail}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                      +${new Intl.NumberFormat("es-AR").format(income.amount_ars)}
                    </td>
                    <td style={{ textAlign: "right", fontSize: "13px", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                      u$d {income.amount_usd < 10 ? income.amount_usd.toFixed(1) : Math.round(income.amount_usd)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEdit(income)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            transition: "color 0.15s ease, background 0.15s ease",
                          }}
                          title="Editar ingreso"
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-green)";
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,232,122,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                            (e.currentTarget as HTMLButtonElement).style.background = "none";
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(income.id)}
                          style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "6px", opacity: 0.7 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((income) => {
              const cat = getCategoryById(income.category_id);
              return (
                <div
                  key={income.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: cat ? `${cat.color}20` : "#252525",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      flexShrink: 0,
                    }}
                  >
                    {cat?.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: "500" }}>{income.detail}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {cat?.name} · {new Date(income.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--accent-green)", fontVariantNumeric: "tabular-nums" }}>
                      +${new Intl.NumberFormat("es-AR").format(income.amount_ars)}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--accent-blue)", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                      u$d {Math.round(income.amount_usd)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(income)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      style={{ background: "none", border: "none", color: "var(--error)", cursor: "pointer", padding: "4px", opacity: 0.6 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <IncomeDrawer
        open={drawerOpen}
        onClose={handleClose}
        onSave={handleSave}
        editingIncome={editingIncome}
      />

      <button
        onClick={openAdd}
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: "80px",
          right: "20px",
          width: "56px",
          height: "56px",
          background: "var(--accent-green)",
          border: "none",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0, 232, 122, 0.4)",
          cursor: "pointer",
          zIndex: 40,
        }}
      >
        <Plus size={24} color="#0f0f0f" strokeWidth={2.5} />
      </button>
    </div>
  );
}
