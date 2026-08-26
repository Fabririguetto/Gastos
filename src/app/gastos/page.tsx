"use client";

import { useState } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown } from "lucide-react";
import { EXPENSES, CATEGORIES, CURRENT_CCL, getCategoryById } from "@/lib/mock-data";
import type { Expense } from "@/types/database";

const MONTHS = [
  { value: "2026-08", label: "Agosto 2026" },
  { value: "2026-07", label: "Julio 2026" },
  { value: "2026-06", label: "Junio 2026" },
];

const expenseCategories = CATEGORIES.filter((c) => c.type === "expense");

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

interface ExpenseFormData {
  date: string;
  category_id: string;
  detail: string;
  currency: "ARS" | "USD";
  amount: string;
  ccl_rate: string;
}

function ExpenseDrawer({
  open,
  onClose,
  onSave,
  editingExpense,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData, editingId?: string) => void;
  editingExpense?: Expense | null;
}) {
  const defaultForm: ExpenseFormData = {
    date: new Date().toISOString().split("T")[0],
    category_id: expenseCategories[0]?.id ?? "",
    detail: "",
    currency: "ARS",
    amount: "",
    ccl_rate: String(CURRENT_CCL),
  };

  const [form, setForm] = useState<ExpenseFormData>(
    editingExpense
      ? {
          date: editingExpense.date,
          category_id: editingExpense.category_id,
          detail: editingExpense.detail,
          currency: editingExpense.currency as "ARS" | "USD",
          amount: String(editingExpense.amount),
          ccl_rate: String(editingExpense.ccl_rate),
        }
      : defaultForm
  );

  // Sync form when editingExpense changes
  const [lastEditing, setLastEditing] = useState<string | undefined>(editingExpense?.id);
  if (editingExpense?.id !== lastEditing) {
    setLastEditing(editingExpense?.id);
    if (editingExpense) {
      setForm({
        date: editingExpense.date,
        category_id: editingExpense.category_id,
        detail: editingExpense.detail,
        currency: editingExpense.currency as "ARS" | "USD",
        amount: String(editingExpense.amount),
        ccl_rate: String(editingExpense.ccl_rate),
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

  const isEditing = !!editingExpense;

  return (
    <>
      {/* Backdrop */}
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

      {/* Drawer */}
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
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* Header */}
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
              {isEditing ? "Editar gasto" : "Agregar gasto"}
            </h2>
            {isEditing && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Modificá los datos del gasto
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

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Fecha */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Fecha
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Categoría */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Categoría
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  style={{ appearance: "none", paddingRight: "36px" }}
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Detalle */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Detalle
              </label>
              <input
                type="text"
                placeholder="Ej: Supermercado Carrefour"
                value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
              />
            </div>

            {/* Currency toggle */}
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
                      letterSpacing: "0.02em",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
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

            {/* CCL */}
            <div>
              <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tipo de cambio CCL
              </label>
              <input
                type="number"
                value={form.ccl_rate}
                onChange={(e) => setForm({ ...form, ccl_rate: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "12px",
          }}
        >
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
                onSave(form, editingExpense?.id);
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
            {isEditing ? "Actualizar gasto" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>(EXPENSES);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2026-08");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = expenses.filter((e) => {
    const monthMatch = e.date.startsWith(selectedMonth);
    const catMatch = selectedCategory === "all" || e.category_id === selectedCategory;
    return monthMatch && catMatch;
  });

  const total = filtered.reduce((s, e) => s + e.amount_ars, 0);

  const openAdd = () => {
    setEditingExpense(null);
    setDrawerOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditingExpense(null);
  };

  const handleSave = (data: ExpenseFormData, editingId?: string) => {
    const ccl = parseFloat(data.ccl_rate) || CURRENT_CCL;
    const amount = parseFloat(data.amount) || 0;

    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? {
                ...e,
                date: data.date,
                category_id: data.category_id,
                detail: data.detail,
                amount,
                currency: data.currency,
                amount_ars: data.currency === "ARS" ? amount : amount * ccl,
                amount_usd: data.currency === "USD" ? amount : amount / ccl,
                ccl_rate: ccl,
              }
            : e
        )
      );
    } else {
      const newExpense: Expense = {
        id: `e-${Date.now()}`,
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
      setExpenses((prev) => [newExpense, ...prev]);
    }
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{ minHeight: "100vh", padding: "32px 24px", maxWidth: "1200px", animation: "fadeIn 0.4s ease-out" }} className="mx-auto">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>Gastos</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {filtered.length} registros · Total:{" "}
            <span style={{ color: "var(--error)", fontWeight: 600 }}>
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

      {/* Filters */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ paddingRight: "32px", appearance: "none", minWidth: "160px" }}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>

        <div style={{ position: "relative" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ paddingRight: "32px", appearance: "none", minWidth: "150px" }}
          >
            <option value="all">Todas las categorías</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>
            ))}
          </select>
          <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Table */}
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>Sin gastos este período</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "8px" }}>
            Agrega tu primer gasto con el botón de arriba
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
            <div style={{ overflowX: "auto" }}>
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
                  {filtered.map((expense) => (
                    <tr key={expense.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                        {new Date(expense.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </td>
                      <td>
                        <CategoryChip categoryId={expense.category_id} />
                      </td>
                      <td style={{ maxWidth: "220px" }}>
                        <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {expense.detail}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                        ${new Intl.NumberFormat("es-AR").format(expense.amount_ars)}
                      </td>
                      <td style={{ textAlign: "right", fontSize: "13px", color: "var(--accent-blue)", fontVariantNumeric: "tabular-nums" }}>
                        u$d {expense.amount_usd < 10 ? expense.amount_usd.toFixed(1) : Math.round(expense.amount_usd)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEdit(expense)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: "6px",
                              borderRadius: "6px",
                              transition: "color 0.15s ease, background 0.15s ease",
                            }}
                            title="Editar gasto"
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
                            onClick={() => handleDelete(expense.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--error)",
                              cursor: "pointer",
                              padding: "6px",
                              borderRadius: "6px",
                              opacity: 0.7,
                              transition: "opacity 0.15s ease",
                            }}
                            title="Eliminar"
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
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((expense) => {
              const cat = getCategoryById(expense.category_id);
              return (
                <div
                  key={expense.id}
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
                    <p style={{ fontSize: "14px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {expense.detail}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {cat?.name} · {new Date(expense.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "15px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>
                      ${new Intl.NumberFormat("es-AR").format(expense.amount_ars)}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--accent-blue)", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                      u$d {Math.round(expense.amount_usd)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(expense)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
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

      <ExpenseDrawer
        open={drawerOpen}
        onClose={handleClose}
        onSave={handleSave}
        editingExpense={editingExpense}
      />

      {/* Mobile FAB */}
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
