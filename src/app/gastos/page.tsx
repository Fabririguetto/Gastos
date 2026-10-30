"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, ChevronDown, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { DateRangeFilter, DateRange, currentMonthRange } from "@/components/ui/DateRangeFilter";
import type { Expense, Category, Card, CardClosingOverride } from "@/types/database";
import { suggestFirstInstallmentDate } from "@/lib/cardClosing";
import { buildDistributedExpenses } from "@/lib/installmentExpenses";

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
  hasRefund: boolean;
  refundAmount: string;
  refundCategoryId: string;
  refundDate: string;
  isInstallment: boolean;
  cardId: string;
  totalInstallments: string;
  paidAmount: string;
  startDate: string;
  countsTowardsBalance: boolean;
}

function ExpenseDrawer({
  open, onClose, onSave, editingExpense, categories, cards, overrides, currentCcl,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData, editingId?: string) => Promise<void>;
  editingExpense?: Expense | null;
  categories: Category[];
  cards: Card[];
  overrides: CardClosingOverride[];
  currentCcl: number;
}) {
  const expenseCats = categories.filter((c) => c.type === "expense");
  const incomeCats = categories.filter((c) => c.type === "income");
  const defaultRefundCategoryId = incomeCats.find((c) => c.name === "Regalo")?.id ?? incomeCats[0]?.id ?? "";

  function suggestedStartDateFor(cardId: string): string {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return new Date().toISOString().split("T")[0];
    const today = new Date();
    return suggestFirstInstallmentDate(card, today.getFullYear(), today.getMonth() + 1, today.getDate(), overrides);
  }

  const defaultForm = (): ExpenseFormData => {
    const today = new Date().toISOString().split("T")[0];
    const initialCardId = cards[0]?.id ?? "";
    return {
      date: today,
      category_id: expenseCats[0]?.id ?? "",
      detail: "",
      currency: "ARS",
      amount: "",
      ccl_rate: String(currentCcl),
      hasRefund: false,
      refundAmount: "",
      refundCategoryId: defaultRefundCategoryId,
      refundDate: today,
      isInstallment: false,
      cardId: initialCardId,
      totalInstallments: "1",
      paidAmount: "",
      startDate: initialCardId ? suggestedStartDateFor(initialCardId) : today,
      countsTowardsBalance: true,
    };
  };

  const [form, setForm] = useState<ExpenseFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [startDateTouched, setStartDateTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setStartDateTouched(false);
      setForm(editingExpense ? {
        date: editingExpense.date,
        category_id: editingExpense.category_id,
        detail: editingExpense.detail,
        currency: editingExpense.currency as "ARS" | "USD",
        amount: String(editingExpense.amount),
        ccl_rate: String(editingExpense.ccl_rate),
        hasRefund: false,
        refundAmount: "",
        refundCategoryId: defaultRefundCategoryId,
        refundDate: editingExpense.date,
        isInstallment: false,
        cardId: cards[0]?.id ?? "",
        totalInstallments: "1",
        paidAmount: "",
        startDate: cards[0]?.id ? suggestedStartDateFor(cards[0].id) : editingExpense.date,
        countsTowardsBalance: true,
      } : defaultForm());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingExpense?.id]);

  useEffect(() => {
    if (open && form.isInstallment && form.cardId && !startDateTouched && !editingExpense) {
      setForm((f) => ({ ...f, startDate: suggestedStartDateFor(f.cardId) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cardId, form.isInstallment]);

  const amountNum = parseFloat(form.amount) || 0;
  const cclNum = parseFloat(form.ccl_rate) || currentCcl;
  const equivalent = form.currency === "ARS"
    ? `≈ u$d ${(amountNum / cclNum).toFixed(2)} @ $${cclNum.toLocaleString("es-AR")} CCL`
    : `≈ $${Math.round(amountNum * cclNum).toLocaleString("es-AR")} ARS @ $${cclNum.toLocaleString("es-AR")} CCL`;

  const refundAmountNum = parseFloat(form.refundAmount) || 0;
  const refundEquivalent = form.currency === "ARS"
    ? `≈ u$d ${(refundAmountNum / cclNum).toFixed(2)}`
    : `≈ $${Math.round(refundAmountNum * cclNum).toLocaleString("es-AR")} ARS`;

  const installmentsNum = parseInt(form.totalInstallments) || 1;
  const paidTotalNum = parseFloat(form.paidAmount || form.amount) || amountNum;
  const perInstallment = amountNum / installmentsNum;
  const perInstallmentMine = paidTotalNum / installmentsNum;
  const isShared = paidTotalNum > 0 && Math.abs(paidTotalNum - amountNum) > 0.01;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.detail.trim()) e.detail = "El detalle es obligatorio";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Ingresá un monto mayor a cero";
    if (!form.date) e.date = "La fecha es obligatoria";
    if (form.isInstallment) {
      if (!form.cardId) e.cardId = "Seleccioná una tarjeta";
      if (!form.startDate) e.startDate = "La fecha de primera cuota es obligatoria";
    }
    if (form.hasRefund) {
      if (!form.refundAmount || refundAmountNum <= 0) e.refundAmount = "Ingresá un monto de reintegro mayor a cero";
      if (!form.refundCategoryId) e.refundCategoryId = "Elegí una categoría para el reintegro";
      if (!form.refundDate) e.refundDate = "La fecha del reintegro es obligatoria";
    }
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

            {/* Compra en cuotas (solo al crear) */}
            {!editingExpense && cards.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.isInstallment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        isInstallment: checked,
                        cardId: prev.cardId || cards[0]?.id || "",
                        startDate: prev.startDate || suggestedStartDateFor(prev.cardId || cards[0]?.id || ""),
                      }));
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  💳 Compra en cuotas con tarjeta
                </label>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Registra la compra en Cuotas y distribuye el gasto mes a mes automáticamente.
                </p>

                {form.isInstallment && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tarjeta *</label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={form.cardId}
                          onChange={(e) => setForm({ ...form, cardId: e.target.value })}
                          style={{ appearance: "none", paddingRight: "36px" }}
                        >
                          {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                      </div>
                      {errors.cardId && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.cardId}</p>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>N° cuotas</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={form.totalInstallments}
                          onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>1° Cuota (mes)</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => {
                            setStartDateTouched(true);
                            setForm({ ...form, startDate: e.target.value });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Lo que abonás vos <span style={{ fontWeight: 400, textTransform: "none", fontSize: "11px" }}>(opcional si es compartida)</span>
                      </label>
                      <input
                        type="number"
                        placeholder={form.amount || "= monto total"}
                        value={form.paidAmount}
                        onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                      />
                    </div>

                    {perInstallment > 0 && (
                      <div style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-blue)" }}>
                          <span>Cuota tarjeta:</span>
                          <strong>${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(perInstallment)} {form.currency}</strong>
                        </div>
                        {isShared && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-green)", marginTop: "4px" }}>
                            <span>Mi aporte/cuota:</span>
                            <strong>${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(perInstallmentMine)} {form.currency}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ background: "#202020", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: "600" }}>¿Descuenta de mi saldo este mes?</p>
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {form.countsTowardsBalance
                              ? "Sí: la 1° cuota impacta este mes y las siguientes en los meses sucesivos"
                              : "No: impacta a partir del mes de pago de la tarjeta y los meses sucesivos"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, countsTowardsBalance: !form.countsTowardsBalance })}
                          style={{ width: "44px", height: "24px", borderRadius: "12px", border: "none", background: form.countsTowardsBalance ? "var(--accent-green)" : "var(--border)", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}
                        >
                          <div style={{ position: "absolute", top: "3px", left: form.countsTowardsBalance ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s ease" }} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reintegro (solo al crear) */}
            {!editingExpense && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.hasRefund}
                    onChange={(e) => setForm({
                      ...form,
                      hasRefund: e.target.checked,
                      refundAmount: e.target.checked && !form.refundAmount ? form.amount : form.refundAmount,
                    })}
                    style={{ width: "16px", height: "16px" }}
                  />
                  🔄 Este gasto tiene reintegro
                </label>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Ej: beneficios de tarjeta que devuelven parte o todo el pago. Se va a cargar automáticamente un ingreso vinculado.
                </p>

                {form.hasRefund && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto del reintegro ({form.currency})</label>
                      <input type="number" placeholder="0.00" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} style={errors.refundAmount ? { borderColor: "var(--error)" } : {}} />
                      {errors.refundAmount && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.refundAmount}</p>}
                      {refundAmountNum > 0 && <p style={{ fontSize: "12px", color: "var(--accent-green)", marginTop: "6px" }}>{refundEquivalent}</p>}
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría del reintegro</label>
                      <div style={{ position: "relative" }}>
                        <select value={form.refundCategoryId} onChange={(e) => setForm({ ...form, refundCategoryId: e.target.value })} style={{ appearance: "none", paddingRight: "36px" }}>
                          {incomeCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                      </div>
                      {errors.refundCategoryId && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.refundCategoryId}</p>}
                      {incomeCats.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Creá primero una categoría de ingreso en Configuración.</p>}
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fecha del reintegro</label>
                      <input type="date" value={form.refundDate} onChange={(e) => setForm({ ...form, refundDate: e.target.value })} style={errors.refundDate ? { borderColor: "var(--error)" } : {}} />
                      {errors.refundDate && <p style={{ fontSize: "11px", color: "var(--error)", marginTop: "4px" }}>{errors.refundDate}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
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
  const [cards, setCards] = useState<Card[]>([]);
  const [overrides, setOverrides] = useState<CardClosingOverride[]>([]);
  const [refundedExpenseIds, setRefundedExpenseIds] = useState<Set<string>>(new Set());
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

      const [expRes, catRes, rateRes, cardsRes, overridesRes] = await Promise.all([
        sb.from("expenses").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        sb.from("categories").select("*").order("name"),
        sb.from("exchange_rates").select("ccl_rate").order("date", { ascending: false }).limit(1).maybeSingle(),
        sb.from("cards").select("*").order("name"),
        sb.from("card_closing_overrides").select("*"),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (rateRes.data) setCurrentCcl(Number(rateRes.data.ccl_rate));
      if (cardsRes.data) setCards(cardsRes.data);
      if (overridesRes.data) setOverrides(overridesRes.data);

      const expenseIds = (expRes.data ?? []).map((e) => e.id);
      if (expenseIds.length > 0) {
        const { data: refundsData } = await sb
          .from("incomes")
          .select("source_expense_id")
          .in("source_expense_id", expenseIds);
        setRefundedExpenseIds(new Set((refundsData ?? []).map((r) => r.source_expense_id).filter(Boolean)));
      } else {
        setRefundedExpenseIds(new Set());
      }
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
      } else if (data.isInstallment) {
        const [sy, sm] = data.startDate.split("-").map(Number);
        const totalInst = parseInt(data.totalInstallments) || 1;
        const endMonthTotal = sm + totalInst - 1;
        const endYear = sy + Math.floor((endMonthTotal - 1) / 12);
        const endMonth = ((endMonthTotal - 1) % 12) + 1;
        const end_date = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

        const { data: insertedPurchase, error: pErr } = await sb.from("installment_purchases").insert({
          description: data.detail,
          card_id: data.cardId || null,
          category_id: data.category_id || null,
          total_amount: amount,
          paid_amount: parseFloat(data.paidAmount || data.amount) || amount,
          currency: data.currency,
          total_installments: totalInst,
          paid_installments: 0,
          start_date: data.startDate,
          end_date,
          counts_towards_balance: data.countsTowardsBalance,
        }).select("id, created_at").single();

        if (pErr) throw pErr;

        if (insertedPurchase?.id) {
          const registrationDate = data.date;
          const expenses = buildDistributedExpenses({
            purchaseId: insertedPurchase.id,
            description: data.detail,
            totalAmount: amount,
            paidAmount: parseFloat(data.paidAmount || data.amount) || amount,
            currency: data.currency,
            totalInstallments: totalInst,
            categoryId: data.category_id,
            startDate: data.startDate,
            registrationDate,
            countsTowardsBalance: data.countsTowardsBalance,
            ccl,
          });
          const { data: insertedExpenses, error: expErr } = await sb
            .from("expenses")
            .insert(expenses)
            .select("id, date")
            .order("date", { ascending: true });
          if (expErr) throw expErr;

          if (data.hasRefund && insertedExpenses && insertedExpenses.length > 0) {
            const refundAmount = parseFloat(data.refundAmount) || 0;
            const refundPayload = {
              date: data.refundDate,
              category_id: data.refundCategoryId,
              detail: `Reintegro: ${data.detail}`,
              amount: refundAmount,
              currency: data.currency,
              amount_ars: data.currency === "ARS" ? refundAmount : refundAmount * ccl,
              amount_usd: data.currency === "USD" ? refundAmount : refundAmount / ccl,
              ccl_rate: ccl,
              source_expense_id: insertedExpenses[0].id,
            };
            const { error: refundError } = await sb.from("incomes").insert(refundPayload);
            if (refundError) showToast("Compra guardada, pero falló el reintegro vinculado", "error");
          }
        }
        showToast("Compra en cuotas registrada", "success");
      } else {
        const { data: inserted, error } = await sb.from("expenses").insert(payload).select().single();
        if (error) throw error;
        showToast("Gasto guardado", "success");

        if (data.hasRefund && inserted) {
          const refundAmount = parseFloat(data.refundAmount) || 0;
          const refundPayload = {
            date: data.refundDate,
            category_id: data.refundCategoryId,
            detail: `Reintegro: ${data.detail}`,
            amount: refundAmount,
            currency: data.currency,
            amount_ars: data.currency === "ARS" ? refundAmount : refundAmount * ccl,
            amount_usd: data.currency === "USD" ? refundAmount : refundAmount / ccl,
            ccl_rate: ccl,
            source_expense_id: inserted.id,
          };
          const { error: refundError } = await sb.from("incomes").insert(refundPayload);
          if (refundError) showToast("Gasto guardado, pero falló el reintegro vinculado", "error");
          else showToast("Reintegro vinculado guardado", "success");
        }
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
                      <td>
                        <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px", maxWidth: "260px" }}>
                          {e.installment_purchase_id && (
                            <span title="Compra en cuotas" style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, background: "rgba(14,165,233,0.12)", color: "var(--accent-blue)", flexShrink: 0 }}>
                              💳 Cuota
                            </span>
                          )}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.detail}
                          </span>
                          {refundedExpenseIds.has(e.id) && (
                            <span title="Tiene un reintegro vinculado" style={{ fontSize: "11px", flexShrink: 0 }}>🔄</span>
                          )}
                        </span>
                      </td>
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
        cards={cards}
        overrides={overrides}
        currentCcl={currentCcl}
      />

    </div>
  );
}
